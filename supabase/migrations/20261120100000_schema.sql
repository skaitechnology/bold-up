-- BOLD UP — core schema
-- Tables only. Functions/triggers live in the next migration, policies in the one after.

create extension if not exists btree_gist with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------- enums

create type public.user_role as enum ('customer', 'coach', 'admin');

-- Profile-level verification. Only admins (through RPCs) move a coach to approved.
create type public.verification_status as enum (
  'draft',              -- not submitted yet
  'awaiting_review',    -- submitted, waiting for a human
  'changes_requested',  -- admin asked for more, or a required document is no longer valid
  'approved',
  'rejected',
  'suspended'
);

-- Document-level verification.
create type public.document_status as enum (
  'uploaded',
  'precheck_pending',
  'precheck_completed',
  'needs_attention',    -- technical pre-check failed, coach must replace the file
  'awaiting_review',
  'approved',
  'rejected',
  'info_requested',
  'expired'
);

create type public.booking_status as enum ('requested', 'accepted', 'declined', 'cancelled', 'completed');
create type public.venue_category as enum ('gym', 'studio', 'shop', 'school', 'other');
create type public.partner_status as enum ('listed', 'partner');
create type public.claim_status as enum ('unclaimed', 'claimed');

-- ---------------------------------------------------------------- people

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  email text not null,
  full_name text not null default '',
  phone text,
  city text,
  postal_code text,
  favorite_sports text[] not null default '{}',
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  goal text check (goal is null or char_length(goal) <= 300),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  is_demo boolean not null default false,
  is_suspended boolean not null default false,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_fr text not null,
  name_en text not null,
  icon text not null default 'dumbbell',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- coaches

create table public.coach_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null default '' check (char_length(display_name) <= 80),
  headline text not null default '' check (char_length(headline) <= 120),
  bio text not null default '' check (char_length(bio) <= 1200),
  experience text not null default '' check (char_length(experience) <= 2000),
  years_experience int check (years_experience between 0 and 60),
  photo_path text,
  -- Approximate operating location: a town centroid with jitter, never a home address.
  city text,
  postal_code text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  service_radius_km int not null default 5 check (service_radius_km between 1 and 50),
  at_home boolean not null default false,
  at_gym boolean not null default false,
  outdoor boolean not null default false,
  online boolean not null default false,
  levels text[] not null default '{}' check (levels <@ array['beginner', 'intermediate', 'advanced']),
  formats text[] not null default '{}' check (formats <@ array['private', 'group']),
  training_school text check (training_school is null or char_length(training_school) <= 120),
  instagram text check (instagram is null or char_length(instagram) <= 60),
  website text check (website is null or char_length(website) <= 200),
  -- booking settings
  slot_step_min int not null default 30 check (slot_step_min in (15, 30, 60)),
  min_notice_hours int not null default 12 check (min_notice_hours between 0 and 168),
  accepting_bookings boolean not null default true,
  -- verification (protected: only RPCs / service role may change these)
  verification_status public.verification_status not null default 'draft',
  is_published boolean not null default false,
  review_note text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coach_profiles_public_idx on public.coach_profiles (verification_status, is_published);

create table public.coach_sports (
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  sport_id uuid not null references public.sports (id) on delete cascade,
  primary key (coach_id, sport_id)
);
create index coach_sports_sport_idx on public.coach_sports (sport_id);

create table public.coach_services (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 400),
  duration_min int not null check (duration_min between 15 and 240),
  price_cents int not null check (price_cents between 0 and 100000),
  format text not null default 'private' check (format in ('private', 'group')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index coach_services_coach_idx on public.coach_services (coach_id);

-- What the coach states about their qualifications. "verified" is set by an admin only.
create table public.coach_qualifications (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  kind text not null check (kind in ('carte_pro', 'bpjeps', 'dejeps', 'desjeps', 'staps', 'cqp', 'federal', 'other')),
  title text not null check (char_length(title) between 2 and 160),
  issuer text check (issuer is null or char_length(issuer) <= 120),
  year_obtained int check (year_obtained between 1960 and 2100),
  status text not null default 'declared' check (status in ('declared', 'verified')),
  created_at timestamptz not null default now()
);
create index coach_qualifications_coach_idx on public.coach_qualifications (coach_id);

create table public.coach_media (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index coach_media_coach_idx on public.coach_media (coach_id);

-- ---------------------------------------------------------------- verification

-- Which documents exist and which ones the platform requires. Editable by admins:
-- requirements are platform policy, not a hardcoded reading of the law.
create table public.document_types (
  code text primary key check (code ~ '^[a-z_]+$'),
  name_fr text not null,
  name_en text not null,
  hint_fr text not null default '',
  hint_en text not null default '',
  is_required boolean not null default false,
  has_expiry boolean not null default false,
  sort_order int not null default 0
);

create table public.coach_documents (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  type_code text not null references public.document_types (code),
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) <= 200),
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0),
  status public.document_status not null default 'uploaded',
  precheck jsonb,
  reference text check (reference is null or char_length(reference) <= 80),
  expires_on date,
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coach_documents_coach_idx on public.coach_documents (coach_id);
create index coach_documents_status_idx on public.coach_documents (status);

-- Append-only history of every verification state change (documents and profiles).
create table public.verification_events (
  id bigint generated always as identity primary key,
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  document_id uuid references public.coach_documents (id) on delete set null,
  scope text not null check (scope in ('document', 'profile', 'qualification')),
  from_status text,
  to_status text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text not null check (actor_role in ('coach', 'admin', 'system')),
  note text,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index verification_events_coach_idx on public.verification_events (coach_id, created_at desc);

-- ---------------------------------------------------------------- availability & bookings

-- Weekly opening hours, in Europe/Paris local time. weekday: ISO, 1 = Monday.
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index availability_rules_coach_idx on public.availability_rules (coach_id, weekday);

-- Days off (inclusive range of local dates).
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text check (reason is null or char_length(reason) <= 120),
  check (ends_on >= starts_on)
);
create index availability_exceptions_coach_idx on public.availability_exceptions (coach_id, starts_on);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid references public.coach_services (id) on delete set null,
  -- snapshot of the service at request time, so later edits never rewrite history
  service_name text not null,
  duration_min int not null,
  price_cents int not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location_kind text not null default 'to_agree' check (location_kind in ('to_agree', 'gym', 'home', 'outdoor', 'online')),
  location_note text check (location_note is null or char_length(location_note) <= 200),
  message text check (message is null or char_length(message) <= 600),
  status public.booking_status not null default 'requested',
  decided_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (customer_id <> coach_id),
  -- A coach can never hold two live bookings on overlapping time ranges.
  constraint bookings_no_overlap exclude using gist (
    coach_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('requested', 'accepted'))
);
create index bookings_coach_idx on public.bookings (coach_id, starts_at);
create index bookings_customer_idx on public.bookings (customer_id, starts_at);

-- ---------------------------------------------------------------- messaging

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  unique (coach_id, customer_id),
  check (coach_id <> customer_id)
);
create index conversations_customer_idx on public.conversations (customer_id);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.favorites (
  customer_id uuid not null references public.profiles (id) on delete cascade,
  coach_id uuid not null references public.coach_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, coach_id)
);

-- ---------------------------------------------------------------- venues

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 120),
  category public.venue_category not null default 'gym',
  description text not null default '' check (char_length(description) <= 1200),
  address text,
  postal_code text,
  city text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  phone text,
  website text,
  facilities text[] not null default '{}',
  photo_path text,
  partner_status public.partner_status not null default 'listed',
  claim_status public.claim_status not null default 'unclaimed',
  is_published boolean not null default true,
  -- provenance: 'osm' rows come from OpenStreetMap (ODbL) and keep their reference
  source text not null default 'admin' check (source in ('admin', 'osm', 'demo')),
  source_ref text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index venues_published_idx on public.venues (is_published, category);

-- ---------------------------------------------------------------- system

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- Fixed-window counters for rate limiting sensitive operations (service role only).
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);
