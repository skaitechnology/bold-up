-- BOLD UP V2 — what clubs and street workout spots need on top of a venue, and sports events.

-- ---------------------------------------------------------------- places

alter table public.venues
  -- disciplines practised there (sports.slug values); drives the discipline filter for clubs
  add column sports text[] not null default '{}',
  -- free to use (street workout spots, some municipal facilities)
  add column is_free boolean not null default false,
  -- open access at any time, no opening hours
  add column always_open boolean not null default false;

create index venues_sports_idx on public.venues using gin (sports);

-- ---------------------------------------------------------------- events

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 140),
  kind text not null check (kind in ('hyrox', 'marathon', 'trail', 'competition', 'challenge', 'local')),
  -- optional link to a discipline (sports.slug): colours, and coaches who can help prepare
  sport_slug text check (sport_slug is null or sport_slug ~ '^[a-z0-9-]+$'),
  summary text not null default '' check (char_length(summary) <= 200),
  description text not null default '' check (char_length(description) <= 2000),
  -- local dates (Europe/Paris)
  starts_on date not null,
  ends_on date,
  start_time time,
  place_name text check (place_name is null or char_length(place_name) <= 140),
  address text,
  postal_code text,
  city text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- formats on offer: "10 km", "Semi-marathon", "Solo", "Duo"…
  formats text[] not null default '{}',
  level text not null default 'all' check (level in ('all', 'beginner', 'intermediate', 'advanced')),
  price_from_cents int check (price_from_cents is null or price_from_cents between 0 and 1000000),
  is_free boolean not null default false,
  organizer text check (organizer is null or char_length(organizer) <= 140),
  website text,
  photo_path text,
  is_published boolean not null default true,
  -- provenance: 'demo' rows are fictional and always shown with the "Démo" label
  source text not null default 'admin' check (source in ('admin', 'demo')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index events_published_idx on public.events (is_published, starts_on);

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

grant select on public.events to anon;
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;

alter table public.events enable row level security;

create policy events_read on public.events for select to anon, authenticated
  using (is_published or public.is_admin());
create policy events_admin_insert on public.events for insert to authenticated with check (public.is_admin());
create policy events_admin_update on public.events for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy events_admin_delete on public.events for delete to authenticated using (public.is_admin());
