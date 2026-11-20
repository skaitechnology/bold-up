\set ON_ERROR_STOP 1
\set QUIET 1
create or replace function public.t_expect(p_sql text, p_expected text) returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    v_msg := sqlerrm;
    if v_msg like '%' || p_expected || '%' then raise notice 'ok   blocked (%): %', p_expected, left(p_sql, 78); return; end if;
    raise exception 'TEST FAILED (wrong error "%") for: %', v_msg, p_sql;
  end;
  raise exception 'TEST FAILED (no error, expected "%") for: %', p_expected, p_sql;
end $$;
create or replace function public.t_true(p_cond boolean, p_label text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'TEST FAILED: %', p_label; end if;
  raise notice 'ok   %', p_label;
end $$;

-- users (as the auth service would create them)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@t.test', '{"full_name":"Admin","role":"admin"}'),
  ('00000000-0000-0000-0000-00000000000c', 'coach@t.test', '{"full_name":"Élodie Müller-Dupont","role":"coach"}'),
  ('00000000-0000-0000-0000-00000000000d', 'coach2@t.test', '{"full_name":"Élodie Müller Dupont","role":"coach"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'cust1@t.test', '{"full_name":"Camille R"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'cust2@t.test', '{"full_name":"Other C"}');
select t_true((select role from profiles where email = 'admin@t.test') = 'customer', 'signup metadata cannot create an admin');
update profiles set role = 'admin' where email = 'admin@t.test';
select t_true((select slug from coach_profiles where id = '00000000-0000-0000-0000-00000000000c') = 'elodie-muller-dupont', 'slug is unaccented');
select t_true((select slug from coach_profiles where id = '00000000-0000-0000-0000-00000000000d') = 'elodie-muller-dupont-2', 'duplicate slug gets a suffix');

-- ===== coach session
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
set role authenticated;
select t_expect($$update public.coach_profiles set verification_status = 'approved' where id = auth.uid()$$, 'protected_field');
select t_expect($$update public.profiles set role = 'admin' where id = auth.uid()$$, 'protected_field');
select t_expect($$select public.admin_decide_coach(auth.uid(), 'approve')$$, 'forbidden');
select t_expect($$select public.record_precheck(gen_random_uuid(), true, '{}')$$, 'permission denied');
select t_expect($$select public.hit_rate_limit('x', 1, 60)$$, 'permission denied');
select t_expect($$insert into public.coach_documents (coach_id, type_code, storage_path, file_name, mime_type, size_bytes, status) values (auth.uid(), 'carte_pro', 'x', 'x', 'application/pdf', 10, 'approved')$$, 'permission denied');
select t_expect($$select public.submit_coach_profile()$$, 'profile_incomplete');

update coach_profiles set display_name = 'Élodie Martin', headline = 'Coach boxe', bio = repeat('Bio de test. ', 5), photo_path = 'c/p.jpg',
  city = 'Créteil', postal_code = '94000', lat = 48.79, lng = 2.455, at_gym = true, formats = '{private}', levels = '{beginner}' where id = auth.uid();
select t_true((select slug from coach_profiles where id = auth.uid()) = 'elodie-martin', 'slug follows the name before approval');
insert into coach_sports (coach_id, sport_id) select auth.uid(), id from sports where slug = 'boxe';
insert into coach_services (coach_id, name, duration_min, price_cents) values (auth.uid(), 'Boxe individuelle', 60, 5000);
insert into coach_qualifications (coach_id, kind, title, status) values (auth.uid(), 'bpjeps', 'BPJEPS Boxe', 'verified');
select t_true((select status from coach_qualifications where coach_id = auth.uid()) = 'declared', 'coach cannot self-verify a qualification');
insert into availability_rules (coach_id, weekday, start_time, end_time) select auth.uid(), d, '09:00', '12:00' from generate_series(1, 7) d;
select t_expect($$insert into public.coach_services (coach_id, name, duration_min, price_cents) values ('00000000-0000-0000-0000-00000000000d', 'Hack', 60, 1)$$, 'row-level security');
select t_expect($$select public.register_document('carte_pro', '00000000-0000-0000-0000-00000000000d/x.pdf', 'x.pdf', 'application/pdf', 100)$$, 'forbidden');
select t_expect($$select public.register_document('carte_pro', auth.uid() || '/x.exe', 'x.exe', 'application/x-msdownload', 100)$$, 'unsupported_file_type');
select public.register_document('carte_pro', auth.uid() || '/carte.pdf', 'carte.pdf', 'application/pdf', 1000) as doc1 \gset
select public.register_document('insurance', auth.uid() || '/rc.pdf', 'rc.pdf', 'application/pdf', 1000, null, current_date + 200) as doc2 \gset
select t_true((select status from coach_documents where id = :'doc1') = 'precheck_pending', 'new document waits for the pre-check');
select t_expect($$select public.submit_coach_profile()$$, 'profile_incomplete');

-- ===== service role runs the pre-check
reset role; select set_config('request.jwt.claim.role', 'service_role', false) \gset
set role service_role;
select t_true(public.record_precheck(:'doc1', true, '{"engine":"simulated"}') = 'awaiting_review', 'pre-check pass -> awaiting_review');
select t_true(public.record_precheck(:'doc2', true, '{"engine":"simulated"}') = 'awaiting_review', 'pre-check pass (2)');
select t_expect($$update public.coach_documents set status = 'uploaded' where status = 'awaiting_review'$$, 'invalid_transition');
select t_true((select count(*) from verification_events where document_id = :'doc1') = 4, 'four events logged for one document');

-- ===== coach submits
reset role; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
set role authenticated;
select t_true(public.submit_coach_profile() = 'awaiting_review', 'coach submits a complete profile');
select t_expect($$select public.admin_review_document((select id from public.coach_documents limit 1), 'approve')$$, 'forbidden');

-- ===== anonymous visitor sees nothing yet
reset role; select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false) \gset
set role anon;
select t_true((select count(*) from coach_profiles) = 0, 'unapproved coach is invisible to the public');
select t_true((select count(*) from coach_services) = 0, 'and so are their services');
select t_expect($$select count(*) from public.coach_documents$$, 'permission denied');
select t_expect($$select count(*) from public.profiles$$, 'permission denied');

-- ===== other coach cannot see the documents
reset role; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
set role authenticated;
select t_true((select count(*) from coach_documents) = 0, 'another coach sees no foreign document');
select t_true((select count(*) from verification_events) = 0, 'nor verification history');

-- ===== admin reviews
reset role; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false) \gset
set role authenticated;
select t_true((select count(*) from coach_documents where status = 'awaiting_review') = 2, 'admin sees the review queue');
select t_expect($$select public.admin_decide_coach('00000000-0000-0000-0000-00000000000c', 'approve')$$, 'documents_not_approved');
select t_expect(format($$select public.admin_review_document(%L, 'reject')$$, :'doc1'), 'note_required');
select t_true(public.admin_review_document(:'doc1', 'approve', null, 'Carte vérifiée sur le registre public') = 'approved', 'admin approves document 1');
select t_true(public.admin_review_document(:'doc2', 'approve') = 'approved', 'admin approves document 2');
select t_true(public.admin_decide_coach('00000000-0000-0000-0000-00000000000c', 'approve') = 'approved', 'admin approves the coach');
select t_true((select is_published and verified_by is not null from coach_profiles where id = '00000000-0000-0000-0000-00000000000c'), 'approved coach is published');
select t_true((select count(*) from audit_logs) = 3, 'three audit log rows');
select t_true((public.admin_stats() ->> 'coaches_approved')::int = 1, 'admin stats come from real rows');

-- ===== public + booking
reset role; select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false) \gset
set role anon;
select t_true((select count(*) from coach_profiles) = 1, 'approved coach is public');
select t_true((select count(*) from open_slots('00000000-0000-0000-0000-00000000000c', 60, current_date, current_date + 7)) > 0, 'open slots exist');
select t_expect($$select public.request_booking(gen_random_uuid(), now())$$, 'permission denied');
select starts_at as slot from open_slots('00000000-0000-0000-0000-00000000000c', 60, current_date + 2, current_date + 2) order by 1 limit 1 \gset
select id as svc from coach_services limit 1 \gset

reset role; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
set role authenticated;
select t_expect(format($$select public.request_booking(%L, %L::timestamptz + interval '7 minutes')$$, :'svc', :'slot'), 'slot_unavailable');
select t_expect(format($$select public.request_booking(%L, %L, 'home')$$, :'svc', :'slot'), 'invalid_location');
select public.request_booking(:'svc', :'slot', 'gym', null, 'Bonjour, je débute.') as bk \gset
select t_true((select status from bookings where id = :'bk') = 'requested', 'booking request stored');
select t_expect(format($$select public.respond_booking(%L, 'accept')$$, :'bk'), 'invalid_transition');
select t_expect($$update public.bookings set status = 'accepted'$$, 'permission denied');
update public.coach_profiles set bio = 'hacked' where id = '00000000-0000-0000-0000-00000000000c';
select t_true((select bio from coach_profiles where id = '00000000-0000-0000-0000-00000000000c') <> 'hacked', 'customer cannot edit a coach profile');
select t_true((select count(*) from profile_cards) = 1, 'customer sees only their own identity card');
select public.start_conversation('00000000-0000-0000-0000-00000000000c') as conv \gset
insert into messages (conversation_id, sender_id, body) values (:'conv', auth.uid(), '  Bonjour Coach  ');
select t_expect(format($$insert into public.messages (conversation_id, sender_id, body) values (%L, '00000000-0000-0000-0000-00000000000c', 'spoof')$$, :'conv'), 'row-level security');

-- ===== second customer: same slot is gone, cannot read the conversation
reset role; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', false) \gset
set role authenticated;
select t_expect(format($$select public.request_booking(%L, %L)$$, :'svc', :'slot'), 'slot_unavailable');
select t_true((select count(*) from open_slots('00000000-0000-0000-0000-00000000000c', 60, current_date + 2, current_date + 2) where starts_at = :'slot') = 0, 'requested slot is no longer offered');
select t_true((select count(*) from messages) = 0, 'another customer cannot read the conversation');
select t_true((select count(*) from bookings) = 0, 'nor the booking');
select t_expect(format($$select public.respond_booking(%L, 'cancel')$$, :'bk'), 'forbidden');
select t_expect(format($$insert into public.messages (conversation_id, sender_id, body) values (%L, auth.uid(), 'intrus')$$, :'conv'), 'row-level security');

-- ===== admin has no access to private messages
reset role; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false) \gset
set role authenticated;
select t_true((select count(*) from messages) = 0, 'admin cannot read private messages');
select t_true((select count(*) from conversations) = 0, 'admin cannot list conversations');
select t_true((select count(*) from bookings) = 1, 'admin can see bookings for support');

-- ===== coach answers
reset role; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false) \gset
set role authenticated;
select t_true((select count(*) from notifications where kind = 'booking_requested') = 1, 'coach was notified of the request');
select t_true((select body from messages limit 1) = 'Bonjour Coach', 'coach reads the trimmed message');
select t_true((select full_name from profile_cards where id = '00000000-0000-0000-0000-0000000000c1') = 'Camille R', 'coach sees the customer name');
select t_true((select count(*) from profiles) = 1, 'but not the customer private profile');
select public.mark_conversation_read(:'conv');
insert into messages (conversation_id, sender_id, body) values (:'conv', auth.uid(), 'Bonjour Camille');
select t_expect(format($$select public.respond_booking(%L, 'complete')$$, :'bk'), 'invalid_transition');
select t_true(public.respond_booking(:'bk', 'accept') = 'accepted', 'coach accepts the booking');
select t_expect(format($$select public.respond_booking(%L, 'decline')$$, :'bk'), 'invalid_transition');
select t_expect(format($$select public.respond_booking(%L, 'complete')$$, :'bk'), 'booking_not_finished');

-- re-verification: deleting a required approved document removes the approved status
select t_true(public.delete_document(:'doc2') like '%/rc.pdf', 'coach deletes own document');
select t_true((select verification_status from coach_profiles where id = auth.uid()) = 'changes_requested', 'approval is withdrawn when a required document disappears');

reset role; select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', 'anon', false) \gset
set role anon;
select t_true((select count(*) from coach_profiles) = 0, 'coach is no longer public');

reset role; select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false), set_config('request.jwt.claim.role', 'authenticated', false) \gset
set role authenticated;
select t_true((select count(*) from coach_profiles) = 1, 'customer still sees the coach they booked');
select t_true((select count(*) from messages where read_at is null and sender_id <> auth.uid()) = 1, 'customer has one unread reply');
select t_true(public.respond_booking(:'bk', 'cancel') = 'cancelled', 'customer cancels');
select public.become_coach();
select t_true((select role from profiles where id = auth.uid()) = 'coach', 'customer can become a coach (draft)');
reset role;
select t_true((select count(*) from open_slots('00000000-0000-0000-0000-00000000000c', 60, current_date, current_date + 7)) = 0, 'no slots for a non-approved coach');
-- DST: 09:00 local stays 09:00 local on both sides of the March 2027 change
select t_true((select bool_and(extract(hour from (('2027-03-27'::date + n) + time '09:00') at time zone 'Europe/Paris' at time zone 'Europe/Paris') = 9) from generate_series(0, 2) n), 'local opening hour is stable across daylight saving');
\echo ALL DATABASE TESTS PASSED
