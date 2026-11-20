-- BOLD UP — business rules enforced in the database.
--
-- Security model in one paragraph: API clients (roles `anon` / `authenticated`) can only
-- write what RLS allows, and "guard" triggers freeze the sensitive columns for them.
-- Every state change that matters (verification, bookings, roles) goes through a
-- SECURITY DEFINER function below that checks who is calling. Inside those functions
-- `current_user` is the function owner, which is how the guards tell a trusted code path
-- from a direct API write.

-- ---------------------------------------------------------------- helpers

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and not p.is_suspended
  );
$$;

create or replace function public.is_service()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce((select auth.role()), '') = 'service_role';
$$;

create or replace function public.slugify(p_text text)
returns text
language sql stable set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(p_text, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.unique_coach_slug(p_name text, p_self uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_base text := left(public.slugify(p_name), 60);
  v_candidate text;
  v_n int := 1;
begin
  if v_base = '' then v_base := 'coach'; end if;
  v_candidate := v_base;
  while exists (select 1 from public.coach_profiles c where c.slug = v_candidate and c.id <> p_self) loop
    v_n := v_n + 1;
    v_candidate := v_base || '-' || v_n;
  end loop;
  return v_candidate;
end;
$$;

create or replace function public.notify(p_user uuid, p_kind text, p_data jsonb, p_link text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, kind, data, link)
  values (p_user, p_kind, coalesce(p_data, '{}'::jsonb), p_link);
$$;

create or replace function public.notify_admins(p_kind text, p_data jsonb, p_link text)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, kind, data, link)
  select p.id, p_kind, coalesce(p_data, '{}'::jsonb), p_link
  from public.profiles p where p.role = 'admin' and not p.is_suspended;
$$;

create or replace function public.log_audit(p_action text, p_entity text, p_entity_id text, p_meta jsonb)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, meta)
  values ((select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_meta, '{}'::jsonb));
$$;

-- Fixed-window rate limiter. Returns true while the caller is under the limit.
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------- accounts

-- Creates the profile row for every new auth user. The role comes from signup metadata
-- but is clamped: nobody can sign up as an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role := (case when new.raw_user_meta_data ->> 'role' = 'coach' then 'coach' else 'customer' end)::public.user_role;
  v_name text := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 80);
  v_locale text := case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'fr' end;
begin
  insert into public.profiles (id, role, email, full_name, locale)
  values (new.id, v_role, coalesce(new.email, ''), v_name, v_locale);
  if v_role = 'coach' then
    insert into public.coach_profiles (id, slug, display_name)
    values (new.id, public.unique_coach_slug(v_name, new.id), v_name);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.guard_profiles()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
      or new.role is distinct from old.role
      or new.email is distinct from old.email
      or new.is_demo is distinct from old.is_demo
      or new.is_suspended is distinct from old.is_suspended
      or new.created_at is distinct from old.created_at then
      raise exception 'protected_field' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profiles();

-- A customer account can be upgraded to a coach account (creates a draft coach profile).
create or replace function public.become_coach()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  p public.profiles;
begin
  select * into p from public.profiles where id = v_uid for update;
  if not found then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p.role = 'coach' then return; end if;
  if p.role <> 'customer' or p.is_suspended then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.profiles set role = 'coach' where id = v_uid;
  insert into public.coach_profiles (id, slug, display_name)
  values (v_uid, public.unique_coach_slug(p.full_name, v_uid), p.full_name)
  on conflict (id) do nothing;
end;
$$;

create or replace function public.request_account_deletion()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update public.profiles set deletion_requested_at = now() where id = v_uid and deletion_requested_at is null;
  update public.coach_profiles set is_published = false where id = v_uid;
  perform public.notify_admins('deletion_requested', jsonb_build_object('user_id', v_uid), '/admin/utilisateurs');
  perform public.log_audit('account.deletion_requested', 'profile', v_uid::text, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------- coach profile guards

create or replace function public.profile_status_transition_allowed(p_from public.verification_status, p_to public.verification_status)
returns boolean
language sql immutable set search_path = ''
as $$
  select (p_from, p_to) in (
    ('draft', 'awaiting_review'),
    ('changes_requested', 'awaiting_review'),
    ('rejected', 'awaiting_review'),
    ('awaiting_review', 'approved'),
    ('awaiting_review', 'rejected'),
    ('awaiting_review', 'changes_requested'),
    ('approved', 'changes_requested'),
    ('approved', 'suspended'),
    ('suspended', 'approved')
  );
$$;

create or replace function public.guard_coach_profiles()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
      or new.slug is distinct from old.slug
      or new.verification_status is distinct from old.verification_status
      or new.review_note is distinct from old.review_note
      or new.submitted_at is distinct from old.submitted_at
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
      or new.is_demo is distinct from old.is_demo
      or new.created_at is distinct from old.created_at then
      raise exception 'protected_field' using errcode = '42501';
    end if;
  end if;

  if new.verification_status is distinct from old.verification_status
    and not public.profile_status_transition_allowed(old.verification_status, new.verification_status) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  -- The public URL follows the name until the profile has been approved once.
  if new.display_name is distinct from old.display_name and old.verified_at is null and btrim(new.display_name) <> '' then
    new.slug := public.unique_coach_slug(new.display_name, new.id);
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger coach_profiles_guard before update on public.coach_profiles
  for each row execute function public.guard_coach_profiles();

-- Qualifications are always "declared" when a coach writes them; only admins verify.
create or replace function public.guard_coach_qualifications()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_status public.verification_status;
begin
  if (select auth.role()) in ('authenticated', 'anon') and not public.is_admin() then
    new.status := 'declared';
    select c.verification_status into v_status from public.coach_profiles c where c.id = new.coach_id;
    -- A change on an already approved profile is flagged for a fresh look.
    if v_status = 'approved' then
      insert into public.verification_events (coach_id, scope, from_status, to_status, actor_id, actor_role, note)
      values (new.coach_id, 'qualification', null, 'declared', (select auth.uid()), 'coach', new.title);
      perform public.notify_admins(
        'qualification_changed',
        jsonb_build_object('coach_id', new.coach_id, 'title', new.title),
        '/admin/coachs/' || new.coach_id
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger coach_qualifications_guard before insert or update on public.coach_qualifications
  for each row execute function public.guard_coach_qualifications();

-- ---------------------------------------------------------------- checklist

-- Single source of truth for "what is done / what is missing" on a coach profile.
-- Drives the progress bar, the submit button and the admin approval rule.
create or replace function public.coach_checklist(p_coach_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  c public.coach_profiles;
  v_missing text[];
  v_unapproved text[];
begin
  if not (p_coach_id = (select auth.uid()) or public.is_admin() or public.is_service()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into c from public.coach_profiles where id = p_coach_id;
  if not found then return null; end if;

  -- required types with no document that passed the pre-check
  select coalesce(array_agg(t.code order by t.sort_order), '{}') into v_missing
  from public.document_types t
  where t.is_required and not exists (
    select 1 from public.coach_documents d
    where d.coach_id = p_coach_id and d.type_code = t.code and d.status in ('awaiting_review', 'approved')
  );

  -- required types with no approved document
  select coalesce(array_agg(t.code order by t.sort_order), '{}') into v_unapproved
  from public.document_types t
  where t.is_required and not exists (
    select 1 from public.coach_documents d
    where d.coach_id = p_coach_id and d.type_code = t.code and d.status = 'approved'
  );

  return jsonb_build_object(
    'identity', btrim(c.display_name) <> '' and btrim(c.headline) <> '',
    'photo', c.photo_path is not null,
    'bio', char_length(btrim(c.bio)) >= 40,
    'sports', exists (select 1 from public.coach_sports s where s.coach_id = p_coach_id),
    'services', exists (select 1 from public.coach_services s where s.coach_id = p_coach_id and s.is_active),
    'location', c.lat is not null and c.lng is not null and coalesce(btrim(c.city), '') <> '',
    'qualifications', exists (select 1 from public.coach_qualifications q where q.coach_id = p_coach_id),
    'availability', exists (select 1 from public.availability_rules r where r.coach_id = p_coach_id),
    'documents', cardinality(v_missing) = 0,
    'missing_documents', to_jsonb(v_missing),
    'documents_approved', cardinality(v_unapproved) = 0,
    'unapproved_documents', to_jsonb(v_unapproved)
  );
end;
$$;

create or replace function public.coach_checklist_complete(p_checklist jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select coalesce(bool_and(coalesce((p_checklist ->> k)::boolean, false)), false)
  from unnest(array['identity', 'photo', 'bio', 'sports', 'services', 'location', 'qualifications', 'availability', 'documents']) as k;
$$;

-- ---------------------------------------------------------------- verification: coach side

create or replace function public.submit_coach_profile()
returns public.verification_status
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  c public.coach_profiles;
begin
  select * into c from public.coach_profiles where id = v_uid for update;
  if not found then raise exception 'not_a_coach' using errcode = '42501'; end if;
  if c.verification_status not in ('draft', 'changes_requested', 'rejected') then
    raise exception 'invalid_transition';
  end if;
  if not public.coach_checklist_complete(public.coach_checklist(v_uid)) then
    raise exception 'profile_incomplete';
  end if;

  update public.coach_profiles
  set verification_status = 'awaiting_review', submitted_at = now(), review_note = null
  where id = v_uid;

  insert into public.verification_events (coach_id, scope, from_status, to_status, actor_id, actor_role)
  values (v_uid, 'profile', c.verification_status::text, 'awaiting_review', v_uid, 'coach');

  perform public.notify_admins(
    'coach_submitted',
    jsonb_build_object('coach_id', v_uid, 'name', c.display_name),
    '/admin/coachs/' || v_uid
  );
  return 'awaiting_review';
end;
$$;

create or replace function public.document_status_transition_allowed(p_from public.document_status, p_to public.document_status)
returns boolean
language sql immutable set search_path = ''
as $$
  select (p_from, p_to) in (
    ('uploaded', 'precheck_pending'),
    ('precheck_pending', 'precheck_completed'),
    ('precheck_completed', 'awaiting_review'),
    ('precheck_completed', 'needs_attention'),
    ('awaiting_review', 'approved'),
    ('awaiting_review', 'rejected'),
    ('awaiting_review', 'info_requested'),
    ('approved', 'expired')
  );
$$;

create or replace function public.guard_coach_documents()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and not public.document_status_transition_allowed(old.status, new.status) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger coach_documents_guard before update on public.coach_documents
  for each row execute function public.guard_coach_documents();

-- Called by the app right after the file landed in private storage.
create or replace function public.register_document(
  p_type_code text,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes int,
  p_reference text default null,
  p_expires_on date default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if not exists (select 1 from public.coach_profiles where id = v_uid) then
    raise exception 'not_a_coach' using errcode = '42501';
  end if;
  if not exists (select 1 from public.document_types where code = p_type_code) then
    raise exception 'unknown_document_type';
  end if;
  if split_part(p_storage_path, '/', 1) <> v_uid::text then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'unsupported_file_type';
  end if;
  if p_size_bytes > 10 * 1024 * 1024 then
    raise exception 'file_too_large';
  end if;
  if (select count(*) from public.coach_documents where coach_id = v_uid) >= 20 then
    raise exception 'too_many_documents';
  end if;

  insert into public.coach_documents (coach_id, type_code, storage_path, file_name, mime_type, size_bytes, reference, expires_on, status)
  values (v_uid, p_type_code, p_storage_path, left(p_file_name, 200), p_mime_type, p_size_bytes, nullif(btrim(p_reference), ''), p_expires_on, 'uploaded')
  returning id into v_id;

  insert into public.verification_events (coach_id, document_id, scope, from_status, to_status, actor_id, actor_role)
  values (v_uid, v_id, 'document', null, 'uploaded', v_uid, 'coach');

  update public.coach_documents set status = 'precheck_pending' where id = v_id;
  insert into public.verification_events (coach_id, document_id, scope, from_status, to_status, actor_role)
  values (v_uid, v_id, 'document', 'uploaded', 'precheck_pending', 'system');

  return v_id;
end;
$$;

-- Result of the automated technical pre-check. Service role only: the app server runs
-- the checks (see src/lib/verification/precheck.ts) and reports the outcome here.
create or replace function public.record_precheck(p_document_id uuid, p_passed boolean, p_report jsonb)
returns public.document_status
language plpgsql security definer set search_path = ''
as $$
declare
  d public.coach_documents;
  v_next public.document_status;
  v_coach_status public.verification_status;
begin
  select * into d from public.coach_documents where id = p_document_id for update;
  if not found then raise exception 'not_found'; end if;
  if d.status <> 'precheck_pending' then return d.status; end if;

  v_next := (case when p_passed then 'awaiting_review' else 'needs_attention' end)::public.document_status;

  update public.coach_documents set status = 'precheck_completed', precheck = p_report where id = p_document_id;
  insert into public.verification_events (coach_id, document_id, scope, from_status, to_status, actor_role)
  values (d.coach_id, d.id, 'document', 'precheck_pending', 'precheck_completed', 'system');

  update public.coach_documents set status = v_next where id = p_document_id;
  insert into public.verification_events (coach_id, document_id, scope, from_status, to_status, actor_role)
  values (d.coach_id, d.id, 'document', 'precheck_completed', v_next::text, 'system');

  if p_passed then
    select c.verification_status into v_coach_status from public.coach_profiles c where c.id = d.coach_id;
    if v_coach_status in ('awaiting_review', 'approved', 'changes_requested') then
      perform public.notify_admins(
        'document_to_review',
        jsonb_build_object('coach_id', d.coach_id, 'document_id', d.id, 'type', d.type_code),
        '/admin/coachs/' || d.coach_id
      );
    end if;
  end if;
  return v_next;
end;
$$;

create or replace function public.required_documents_approved(p_coach_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (
    select 1 from public.document_types t
    where t.is_required and not exists (
      select 1 from public.coach_documents d
      where d.coach_id = p_coach_id and d.type_code = t.code and d.status = 'approved'
    )
  );
$$;

-- An approved coach whose required documents are no longer all approved loses the
-- approved status until an admin looks again. Keeps the public badge honest.
create or replace function public.recheck_coach_after_document_change(p_coach_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.coach_profiles c where c.id = p_coach_id and c.verification_status = 'approved')
    and not public.required_documents_approved(p_coach_id) then
    update public.coach_profiles
    set verification_status = 'changes_requested', review_note = p_reason
    where id = p_coach_id;
    insert into public.verification_events (coach_id, scope, from_status, to_status, actor_role, note)
    values (p_coach_id, 'profile', 'approved', 'changes_requested', 'system', p_reason);
    perform public.notify(p_coach_id, 'profile_changes_requested', jsonb_build_object('reason', p_reason), '/pro/documents');
  end if;
end;
$$;

-- Removes a document row and returns its storage path so the caller can delete the file.
create or replace function public.delete_document(p_document_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  d public.coach_documents;
begin
  select * into d from public.coach_documents where id = p_document_id for update;
  if not found then raise exception 'not_found'; end if;
  if d.coach_id <> v_uid then raise exception 'forbidden' using errcode = '42501'; end if;

  insert into public.verification_events (coach_id, document_id, scope, from_status, to_status, actor_id, actor_role, note)
  values (d.coach_id, null, 'document', d.status::text, 'deleted', v_uid, 'coach', d.type_code);
  delete from public.coach_documents where id = p_document_id;

  perform public.recheck_coach_after_document_change(d.coach_id, 'required_document_missing');
  return d.storage_path;
end;
$$;

-- Marks approved documents past their expiry date. Meant for a daily job.
create or replace function public.expire_documents()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  d record;
  v_count int := 0;
begin
  for d in
    select id, coach_id, type_code from public.coach_documents
    where status = 'approved' and expires_on is not null
      and expires_on < (now() at time zone 'Europe/Paris')::date
    for update
  loop
    update public.coach_documents set status = 'expired' where id = d.id;
    insert into public.verification_events (coach_id, document_id, scope, from_status, to_status, actor_role)
    values (d.coach_id, d.id, 'document', 'approved', 'expired', 'system');
    perform public.notify(d.coach_id, 'document_expired', jsonb_build_object('type', d.type_code), '/pro/documents');
    perform public.recheck_coach_after_document_change(d.coach_id, 'required_document_expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------- verification: admin side

create or replace function public.admin_review_document(
  p_document_id uuid,
  p_decision text,
  p_note text default null,
  p_external_check text default null
)
returns public.document_status
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  d public.coach_documents;
  v_next public.document_status;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_external text := nullif(btrim(coalesce(p_external_check, '')), '');
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;

  select * into d from public.coach_documents where id = p_document_id for update;
  if not found then raise exception 'not_found'; end if;
  if d.coach_id = v_admin then raise exception 'forbidden' using errcode = '42501'; end if;
  if d.status <> 'awaiting_review' then raise exception 'invalid_transition'; end if;

  v_next := (case p_decision
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    when 'request_info' then 'info_requested'
  end)::public.document_status;
  if v_next is null then raise exception 'invalid_decision'; end if;
  if v_next in ('rejected', 'info_requested') and v_note is null then raise exception 'note_required'; end if;

  update public.coach_documents
  set status = v_next, review_note = v_note, reviewed_by = v_admin, reviewed_at = now()
  where id = p_document_id;

  insert into public.verification_events (coach_id, document_id, scope, from_status, to_status, actor_id, actor_role, note)
  values (d.coach_id, d.id, 'document', 'awaiting_review', v_next::text, v_admin, 'admin', v_note);

  if v_external is not null then
    insert into public.verification_events (coach_id, document_id, scope, from_status, to_status, actor_id, actor_role, note, is_internal)
    values (d.coach_id, d.id, 'document', v_next::text, v_next::text, v_admin, 'admin', v_external, true);
  end if;

  perform public.log_audit(
    'document.' || p_decision, 'coach_document', d.id::text,
    jsonb_build_object('coach_id', d.coach_id, 'type', d.type_code, 'note', v_note, 'external_check', v_external)
  );
  perform public.notify(
    d.coach_id, 'document_' || v_next::text,
    jsonb_build_object('type', d.type_code, 'note', v_note), '/pro/documents'
  );
  return v_next;
end;
$$;

create or replace function public.admin_decide_coach(p_coach_id uuid, p_decision text, p_note text default null)
returns public.verification_status
language plpgsql security definer set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  c public.coach_profiles;
  v_next public.verification_status;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_checklist jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_coach_id = v_admin then raise exception 'forbidden' using errcode = '42501'; end if;

  select * into c from public.coach_profiles where id = p_coach_id for update;
  if not found then raise exception 'not_found'; end if;

  v_next := (case p_decision
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    when 'request_changes' then 'changes_requested'
    when 'suspend' then 'suspended'
    when 'reinstate' then 'approved'
  end)::public.verification_status;
  if v_next is null then raise exception 'invalid_decision'; end if;
  if not public.profile_status_transition_allowed(c.verification_status, v_next) then
    raise exception 'invalid_transition';
  end if;
  if p_decision in ('reject', 'request_changes', 'suspend') and v_note is null then
    raise exception 'note_required';
  end if;

  if v_next = 'approved' then
    v_checklist := public.coach_checklist(p_coach_id);
    if not public.coach_checklist_complete(v_checklist) then raise exception 'profile_incomplete'; end if;
    if not coalesce((v_checklist ->> 'documents_approved')::boolean, false) then
      raise exception 'documents_not_approved';
    end if;
    update public.coach_profiles
    set verification_status = 'approved', verified_at = now(), verified_by = v_admin, is_published = true, review_note = null
    where id = p_coach_id;
  else
    update public.coach_profiles
    set verification_status = v_next, review_note = v_note
    where id = p_coach_id;
  end if;

  insert into public.verification_events (coach_id, scope, from_status, to_status, actor_id, actor_role, note)
  values (p_coach_id, 'profile', c.verification_status::text, v_next::text, v_admin, 'admin', v_note);

  perform public.log_audit(
    'coach.' || p_decision, 'coach_profile', p_coach_id::text,
    jsonb_build_object('from', c.verification_status, 'to', v_next, 'note', v_note)
  );
  perform public.notify(
    p_coach_id, 'profile_' || v_next::text,
    jsonb_build_object('note', v_note),
    case when v_next = 'approved' then '/pro' else '/pro/documents' end
  );
  return v_next;
end;
$$;

create or replace function public.admin_set_qualification_status(p_qualification_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  q public.coach_qualifications;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('declared', 'verified') then raise exception 'invalid_decision'; end if;
  select * into q from public.coach_qualifications where id = p_qualification_id for update;
  if not found then raise exception 'not_found'; end if;
  if q.coach_id = (select auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;

  update public.coach_qualifications set status = p_status where id = p_qualification_id;
  insert into public.verification_events (coach_id, scope, from_status, to_status, actor_id, actor_role, note)
  values (q.coach_id, 'qualification', q.status, p_status, (select auth.uid()), 'admin', q.title);
  perform public.log_audit('qualification.' || p_status, 'coach_qualification', q.id::text, jsonb_build_object('coach_id', q.coach_id));
end;
$$;

create or replace function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user_id = (select auth.uid()) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.profiles set is_suspended = p_suspended where id = p_user_id;
  if p_suspended then
    update public.coach_profiles set is_published = false where id = p_user_id;
  end if;
  perform public.log_audit(
    case when p_suspended then 'user.suspend' else 'user.reinstate' end, 'profile', p_user_id::text, '{}'::jsonb
  );
end;
$$;

create or replace function public.admin_set_coach_published(p_coach_id uuid, p_published boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.coach_profiles set is_published = p_published where id = p_coach_id;
  perform public.log_audit(
    case when p_published then 'coach.publish' else 'coach.unpublish' end, 'coach_profile', p_coach_id::text, '{}'::jsonb
  );
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'coaches_total', (select count(*) from public.coach_profiles),
    'coaches_pending', (select count(*) from public.coach_profiles where verification_status = 'awaiting_review'),
    'coaches_approved', (select count(*) from public.coach_profiles where verification_status = 'approved'),
    'coaches_rejected', (select count(*) from public.coach_profiles where verification_status = 'rejected'),
    'coaches_draft', (select count(*) from public.coach_profiles where verification_status in ('draft', 'changes_requested')),
    'customers_total', (select count(*) from public.profiles where role = 'customer'),
    'bookings_total', (select count(*) from public.bookings),
    'bookings_requested', (select count(*) from public.bookings where status = 'requested'),
    'bookings_accepted', (select count(*) from public.bookings where status = 'accepted'),
    'documents_to_review', (select count(*) from public.coach_documents where status = 'awaiting_review'),
    'venues_total', (select count(*) from public.venues),
    'venues_partner', (select count(*) from public.venues where partner_status = 'partner')
  );
end;
$$;

-- ---------------------------------------------------------------- availability & bookings

-- Bookable start times for one coach and one duration, in a range of Paris-local dates.
-- Works in local time so opening hours stay put across daylight-saving changes.
create or replace function public.open_slots(p_coach_id uuid, p_duration_min int, p_from date, p_to date)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with c as (
    select cp.id, cp.slot_step_min, cp.min_notice_hours
    from public.coach_profiles cp
    where cp.id = p_coach_id
      and cp.is_published and cp.verification_status = 'approved' and cp.accepting_bookings
      and p_duration_min between 15 and 240
  ),
  days as (
    select d::date as day
    from generate_series(
      greatest(p_from, (now() at time zone 'Europe/Paris')::date)::timestamp,
      least(p_to, p_from + 62)::timestamp,
      interval '1 day'
    ) as d
  ),
  candidates as (
    select ((days.day + r.start_time) + make_interval(mins => n * c.slot_step_min)) at time zone 'Europe/Paris' as slot_start
    from c
    cross join days
    join public.availability_rules r
      on r.coach_id = c.id and r.weekday = extract(isodow from days.day)::int
    cross join lateral generate_series(
      0,
      floor((extract(epoch from (r.end_time - r.start_time)) / 60 - p_duration_min) / c.slot_step_min)::int
    ) as n
    where not exists (
      select 1 from public.availability_exceptions e
      where e.coach_id = c.id and days.day between e.starts_on and e.ends_on
    )
  )
  select distinct cand.slot_start
  from candidates cand
  cross join c
  where cand.slot_start >= now() + make_interval(hours => c.min_notice_hours)
    and not exists (
      select 1 from public.bookings b
      where b.coach_id = c.id
        and b.status in ('requested', 'accepted')
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(cand.slot_start, cand.slot_start + make_interval(mins => p_duration_min), '[)')
    )
  order by 1;
$$;

create or replace function public.booking_status_transition_allowed(p_from public.booking_status, p_to public.booking_status)
returns boolean
language sql immutable set search_path = ''
as $$
  select (p_from, p_to) in (
    ('requested', 'accepted'),
    ('requested', 'declined'),
    ('requested', 'cancelled'),
    ('accepted', 'cancelled'),
    ('accepted', 'completed')
  );
$$;

create or replace function public.guard_bookings()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and not public.booking_status_transition_allowed(old.status, new.status) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger bookings_guard before update on public.bookings
  for each row execute function public.guard_bookings();

create or replace function public.request_booking(
  p_service_id uuid,
  p_starts_at timestamptz,
  p_location_kind text default 'to_agree',
  p_location_note text default null,
  p_message text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  s public.coach_services;
  c public.coach_profiles;
  v_customer public.profiles;
  v_local_date date;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_customer from public.profiles where id = v_uid;
  if not found or v_customer.is_suspended then raise exception 'forbidden' using errcode = '42501'; end if;

  select * into s from public.coach_services where id = p_service_id and is_active;
  if not found then raise exception 'service_unavailable'; end if;

  select * into c from public.coach_profiles where id = s.coach_id;
  if not (c.is_published and c.verification_status = 'approved' and c.accepting_bookings) then
    raise exception 'coach_unavailable';
  end if;
  if c.id = v_uid then raise exception 'cannot_book_self'; end if;

  if p_location_kind not in ('to_agree', 'gym', 'home', 'outdoor', 'online')
    or (p_location_kind = 'gym' and not c.at_gym)
    or (p_location_kind = 'home' and not c.at_home)
    or (p_location_kind = 'outdoor' and not c.outdoor)
    or (p_location_kind = 'online' and not c.online) then
    raise exception 'invalid_location';
  end if;

  if (select count(*) from public.bookings b where b.customer_id = v_uid and b.status = 'requested') >= 10 then
    raise exception 'too_many_requests';
  end if;

  v_local_date := (p_starts_at at time zone 'Europe/Paris')::date;
  if not exists (
    select 1 from public.open_slots(c.id, s.duration_min, v_local_date, v_local_date) o
    where o.starts_at = p_starts_at
  ) then
    raise exception 'slot_unavailable';
  end if;

  begin
    insert into public.bookings (
      coach_id, customer_id, service_id, service_name, duration_min, price_cents,
      starts_at, ends_at, location_kind, location_note, message
    ) values (
      c.id, v_uid, s.id, s.name, s.duration_min, s.price_cents,
      p_starts_at, p_starts_at + make_interval(mins => s.duration_min),
      p_location_kind, nullif(btrim(coalesce(p_location_note, '')), ''), nullif(btrim(coalesce(p_message, '')), '')
    )
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'slot_unavailable';
  end;

  insert into public.conversations (coach_id, customer_id) values (c.id, v_uid)
  on conflict (coach_id, customer_id) do nothing;

  perform public.notify(
    c.id, 'booking_requested',
    jsonb_build_object('booking_id', v_id, 'customer', v_customer.full_name, 'service', s.name, 'starts_at', p_starts_at),
    '/pro/demandes'
  );
  return v_id;
end;
$$;

-- All booking state changes: accept / decline (coach), cancel (either side), complete (coach).
create or replace function public.respond_booking(p_booking_id uuid, p_action text)
returns public.booking_status
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  b public.bookings;
  v_next public.booking_status;
  v_is_coach boolean;
  v_other uuid;
  v_actor_name text;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'not_found'; end if;
  v_is_coach := b.coach_id = v_uid;
  if not (v_is_coach or b.customer_id = v_uid) then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_action = 'accept' then
    if not v_is_coach or b.status <> 'requested' then raise exception 'invalid_transition'; end if;
    if b.starts_at <= now() then raise exception 'booking_in_past'; end if;
    v_next := 'accepted';
  elsif p_action = 'decline' then
    if not v_is_coach or b.status <> 'requested' then raise exception 'invalid_transition'; end if;
    v_next := 'declined';
  elsif p_action = 'cancel' then
    if b.status not in ('requested', 'accepted') then raise exception 'invalid_transition'; end if;
    if b.starts_at <= now() then raise exception 'booking_in_past'; end if;
    v_next := 'cancelled';
  elsif p_action = 'complete' then
    if not v_is_coach or b.status <> 'accepted' then raise exception 'invalid_transition'; end if;
    if b.ends_at > now() then raise exception 'booking_not_finished'; end if;
    v_next := 'completed';
  else
    raise exception 'invalid_decision';
  end if;

  update public.bookings
  set status = v_next,
      decided_at = case when v_next in ('accepted', 'declined') then now() else decided_at end,
      cancelled_by = case when v_next = 'cancelled' then v_uid else cancelled_by end
  where id = b.id;

  v_other := case when v_is_coach then b.customer_id else b.coach_id end;
  if v_is_coach then
    select display_name into v_actor_name from public.coach_profiles where id = v_uid;
  else
    select full_name into v_actor_name from public.profiles where id = v_uid;
  end if;

  if v_next <> 'completed' then
    perform public.notify(
      v_other, 'booking_' || v_next::text,
      jsonb_build_object('booking_id', b.id, 'by', v_actor_name, 'service', b.service_name, 'starts_at', b.starts_at),
      case when v_is_coach then '/reservations' else '/pro/demandes' end
    );
  end if;
  return v_next;
end;
$$;

-- ---------------------------------------------------------------- messaging

create or replace function public.start_conversation(p_coach_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_uid = p_coach_id then raise exception 'cannot_message_self'; end if;
  if exists (select 1 from public.profiles where id = v_uid and is_suspended) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select id into v_id from public.conversations where coach_id = p_coach_id and customer_id = v_uid;
  if v_id is not null then return v_id; end if;

  if not exists (
    select 1 from public.coach_profiles c
    where c.id = p_coach_id and c.is_published and c.verification_status = 'approved'
  ) then
    raise exception 'coach_unavailable';
  end if;

  insert into public.conversations (coach_id, customer_id) values (p_coach_id, v_uid)
  on conflict (coach_id, customer_id) do update set coach_id = excluded.coach_id
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.before_message_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.body := btrim(new.body);
  new.read_at := null;
  new.created_at := now();
  if (select count(*) from public.messages m where m.sender_id = new.sender_id and m.created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limited';
  end if;
  return new;
end;
$$;

create or replace function public.after_message_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_conv public.conversations;
  v_recipient uuid;
  v_sender_name text;
begin
  update public.conversations
  set last_message_at = new.created_at, last_message_preview = left(new.body, 140)
  where id = new.conversation_id
  returning * into v_conv;

  if new.sender_id = v_conv.coach_id then
    v_recipient := v_conv.customer_id;
    select display_name into v_sender_name from public.coach_profiles where id = new.sender_id;
  else
    v_recipient := v_conv.coach_id;
    select full_name into v_sender_name from public.profiles where id = new.sender_id;
  end if;

  -- one unread notification per conversation is enough
  if not exists (
    select 1 from public.notifications n
    where n.user_id = v_recipient and n.kind = 'message_received' and n.read_at is null
      and n.data ->> 'conversation_id' = new.conversation_id::text
  ) then
    perform public.notify(
      v_recipient, 'message_received',
      jsonb_build_object('conversation_id', new.conversation_id, 'from', v_sender_name),
      case when v_recipient = v_conv.coach_id then '/pro/messages/' else '/messages/' end || new.conversation_id
    );
  end if;
  return new;
end;
$$;

create trigger messages_before_insert before insert on public.messages
  for each row execute function public.before_message_insert();
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.after_message_insert();

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and (c.coach_id = v_uid or c.customer_id = v_uid)
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.messages set read_at = now()
  where conversation_id = p_conversation_id and sender_id <> v_uid and read_at is null;
  update public.notifications set read_at = now()
  where user_id = v_uid and kind = 'message_received' and read_at is null
    and data ->> 'conversation_id' = p_conversation_id::text;
end;
$$;

-- ---------------------------------------------------------------- misc triggers

create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger venues_touch before update on public.venues
  for each row execute function public.touch_updated_at();

-- Users may only flip read_at on their own notifications.
create or replace function public.guard_notifications()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.user_id is distinct from old.user_id or new.kind is distinct from old.kind
      or new.data is distinct from old.data or new.link is distinct from old.link
      or new.created_at is distinct from old.created_at then
      raise exception 'protected_field' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger notifications_guard before update on public.notifications
  for each row execute function public.guard_notifications();

-- ---------------------------------------------------------------- views

-- Minimal identity card (name, town) of the people a user is actually dealing with.
-- Runs with owner rights on purpose: `profiles` itself stays private (self + admin).
create view public.profile_cards as
select p.id, p.full_name, p.city
from public.profiles p
where p.id = (select auth.uid())
  or public.is_admin()
  or exists (select 1 from public.bookings b where b.customer_id = p.id and b.coach_id = (select auth.uid()))
  or exists (select 1 from public.conversations c where c.customer_id = p.id and c.coach_id = (select auth.uid()));

-- ---------------------------------------------------------------- execute privileges

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_service() to anon, authenticated, service_role;
grant execute on function public.slugify(text) to anon, authenticated, service_role;
grant execute on function public.unique_coach_slug(text, uuid) to authenticated, service_role;
grant execute on function public.profile_status_transition_allowed(public.verification_status, public.verification_status) to authenticated, service_role;
grant execute on function public.document_status_transition_allowed(public.document_status, public.document_status) to authenticated, service_role;
grant execute on function public.booking_status_transition_allowed(public.booking_status, public.booking_status) to authenticated, service_role;
grant execute on function public.coach_checklist(uuid) to authenticated, service_role;
grant execute on function public.coach_checklist_complete(jsonb) to authenticated, service_role;

grant execute on function public.become_coach() to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.submit_coach_profile() to authenticated;
grant execute on function public.register_document(text, text, text, text, int, text, date) to authenticated;
grant execute on function public.delete_document(uuid) to authenticated;
grant execute on function public.admin_review_document(uuid, text, text, text) to authenticated;
grant execute on function public.admin_decide_coach(uuid, text, text) to authenticated;
grant execute on function public.admin_set_qualification_status(uuid, text) to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean) to authenticated;
grant execute on function public.admin_set_coach_published(uuid, boolean) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.open_slots(uuid, int, date, date) to anon, authenticated, service_role;
grant execute on function public.request_booking(uuid, timestamptz, text, text, text) to authenticated;
grant execute on function public.respond_booking(uuid, text) to authenticated;
grant execute on function public.start_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- service role only: record_precheck, expire_documents, hit_rate_limit, notify*, log_audit
grant execute on all functions in schema public to service_role;
