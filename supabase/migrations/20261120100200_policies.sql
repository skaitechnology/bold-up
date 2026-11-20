-- BOLD UP — privileges, row level security and storage.
-- Start from zero and grant only what each API role needs.

grant usage on schema public to anon, authenticated, service_role;
revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- anonymous visitors: the public marketplace only
grant select on public.sports, public.document_types, public.coach_profiles, public.coach_sports,
  public.coach_services, public.coach_qualifications, public.coach_media, public.availability_rules,
  public.venues to anon;

-- signed-in users (rows are narrowed by the policies below)
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.sports to authenticated;
grant select, insert, update, delete on public.document_types to authenticated;
grant select, update on public.coach_profiles to authenticated;
grant select, insert, delete on public.coach_sports to authenticated;
grant select, insert, update, delete on public.coach_services to authenticated;
grant select, insert, update, delete on public.coach_qualifications to authenticated;
grant select, insert, delete on public.coach_media to authenticated;
grant select on public.coach_documents to authenticated;
grant select on public.verification_events to authenticated;
grant select, insert, update, delete on public.availability_rules to authenticated;
grant select, insert, update, delete on public.availability_exceptions to authenticated;
grant select on public.bookings to authenticated;
grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.venues to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.profile_cards to authenticated;

alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.coach_sports enable row level security;
alter table public.coach_services enable row level security;
alter table public.coach_qualifications enable row level security;
alter table public.coach_media enable row level security;
alter table public.document_types enable row level security;
alter table public.coach_documents enable row level security;
alter table public.verification_events enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.venues enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;

-- ---------------------------------------------------------------- profiles

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------- reference data

create policy sports_read on public.sports for select to anon, authenticated
  using (is_active or public.is_admin());
create policy sports_admin_insert on public.sports for insert to authenticated with check (public.is_admin());
create policy sports_admin_update on public.sports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy sports_admin_delete on public.sports for delete to authenticated using (public.is_admin());

create policy document_types_read on public.document_types for select to anon, authenticated using (true);
create policy document_types_admin_insert on public.document_types for insert to authenticated with check (public.is_admin());
create policy document_types_admin_update on public.document_types for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy document_types_admin_delete on public.document_types for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- coach profiles

-- Public marketplace: approved AND published, nothing else.
create policy coach_profiles_public_read on public.coach_profiles for select to anon, authenticated
  using (is_published and verification_status = 'approved');
create policy coach_profiles_own_read on public.coach_profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
-- A customer keeps seeing the coaches they booked or wrote to, even if unpublished later.
create policy coach_profiles_related_read on public.coach_profiles for select to authenticated
  using (
    exists (select 1 from public.bookings b where b.coach_id = coach_profiles.id and b.customer_id = (select auth.uid()))
    or exists (select 1 from public.conversations c where c.coach_id = coach_profiles.id and c.customer_id = (select auth.uid()))
  );
create policy coach_profiles_own_update on public.coach_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Child tables follow the visibility of their coach profile.
create policy coach_sports_read on public.coach_sports for select to anon, authenticated
  using (exists (select 1 from public.coach_profiles c where c.id = coach_id));
create policy coach_sports_own_insert on public.coach_sports for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy coach_sports_own_delete on public.coach_sports for delete to authenticated
  using (coach_id = (select auth.uid()));

create policy coach_services_read on public.coach_services for select to anon, authenticated
  using (exists (select 1 from public.coach_profiles c where c.id = coach_id));
create policy coach_services_own_insert on public.coach_services for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy coach_services_own_update on public.coach_services for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy coach_services_own_delete on public.coach_services for delete to authenticated
  using (coach_id = (select auth.uid()));

create policy coach_qualifications_read on public.coach_qualifications for select to anon, authenticated
  using (exists (select 1 from public.coach_profiles c where c.id = coach_id));
create policy coach_qualifications_own_insert on public.coach_qualifications for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy coach_qualifications_own_update on public.coach_qualifications for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy coach_qualifications_own_delete on public.coach_qualifications for delete to authenticated
  using (coach_id = (select auth.uid()));

create policy coach_media_read on public.coach_media for select to anon, authenticated
  using (exists (select 1 from public.coach_profiles c where c.id = coach_id));
create policy coach_media_own_insert on public.coach_media for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy coach_media_own_delete on public.coach_media for delete to authenticated
  using (coach_id = (select auth.uid()));

create policy availability_rules_read on public.availability_rules for select to anon, authenticated
  using (exists (select 1 from public.coach_profiles c where c.id = coach_id));
create policy availability_rules_own_insert on public.availability_rules for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy availability_rules_own_update on public.availability_rules for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy availability_rules_own_delete on public.availability_rules for delete to authenticated
  using (coach_id = (select auth.uid()));

-- Days off carry a private reason: owner and admins only. The public sees their effect
-- through open_slots().
create policy availability_exceptions_read on public.availability_exceptions for select to authenticated
  using (coach_id = (select auth.uid()) or public.is_admin());
create policy availability_exceptions_own_insert on public.availability_exceptions for insert to authenticated
  with check (coach_id = (select auth.uid()));
create policy availability_exceptions_own_update on public.availability_exceptions for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy availability_exceptions_own_delete on public.availability_exceptions for delete to authenticated
  using (coach_id = (select auth.uid()));

-- ---------------------------------------------------------------- verification

-- Read-only for API clients: every write goes through the RPCs.
create policy coach_documents_read on public.coach_documents for select to authenticated
  using (coach_id = (select auth.uid()) or public.is_admin());
create policy verification_events_read on public.verification_events for select to authenticated
  using (public.is_admin() or (coach_id = (select auth.uid()) and not is_internal));

-- ---------------------------------------------------------------- bookings

create policy bookings_read on public.bookings for select to authenticated
  using (coach_id = (select auth.uid()) or customer_id = (select auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------- messaging
-- Participants only. Admins get no blanket access to private conversations.

create policy conversations_read on public.conversations for select to authenticated
  using (coach_id = (select auth.uid()) or customer_id = (select auth.uid()));

create policy messages_read on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.coach_id = (select auth.uid()) or c.customer_id = (select auth.uid()))
    )
  );
create policy messages_send on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.coach_id = (select auth.uid()) or c.customer_id = (select auth.uid()))
    )
  );

create policy favorites_read on public.favorites for select to authenticated
  using (customer_id = (select auth.uid()));
create policy favorites_insert on public.favorites for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and coach_id <> (select auth.uid())
    and exists (select 1 from public.coach_profiles c where c.id = coach_id)
  );
create policy favorites_delete on public.favorites for delete to authenticated
  using (customer_id = (select auth.uid()));

-- ---------------------------------------------------------------- venues

create policy venues_read on public.venues for select to anon, authenticated
  using (is_published or public.is_admin());
create policy venues_admin_insert on public.venues for insert to authenticated with check (public.is_admin());
create policy venues_admin_update on public.venues for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy venues_admin_delete on public.venues for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- system

create policy notifications_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

-- rate_limits: RLS on, no policy -> service role only.

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('coach-documents', 'coach-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('coach-media', 'coach-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('venue-media', 'venue-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Private professional documents: files live under "<coach id>/...".
create policy "coach documents: owner uploads" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'coach-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.coach_profiles c where c.id = (select auth.uid()))
  );
create policy "coach documents: owner or admin reads" on storage.objects for select to authenticated
  using (
    bucket_id = 'coach-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );
create policy "coach documents: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'coach-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Public profile photos: world-readable through the public bucket URL, owner-managed.
create policy "coach media: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'coach-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "coach media: owner uploads" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'coach-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.coach_profiles c where c.id = (select auth.uid()))
  );
create policy "coach media: owner updates" on storage.objects for update to authenticated
  using (bucket_id = 'coach-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'coach-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "coach media: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'coach-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "venue media: admin reads" on storage.objects for select to authenticated
  using (bucket_id = 'venue-media' and public.is_admin());
create policy "venue media: admin uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'venue-media' and public.is_admin());
create policy "venue media: admin updates" on storage.objects for update to authenticated
  using (bucket_id = 'venue-media' and public.is_admin())
  with check (bucket_id = 'venue-media' and public.is_admin());
create policy "venue media: admin deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'venue-media' and public.is_admin());

-- ---------------------------------------------------------------- realtime

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
