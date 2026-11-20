-- Messages sent to Bold Up from a venue page ("Do you manage this venue?").
-- Written by the app server only (rate limited there), read by admins.

create table public.venue_inquiries (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 200),
  message text not null check (char_length(message) between 5 and 2000),
  created_at timestamptz not null default now()
);
create index venue_inquiries_venue_idx on public.venue_inquiries (venue_id, created_at desc);

alter table public.venue_inquiries enable row level security;
revoke all on public.venue_inquiries from anon, authenticated;
grant select, delete on public.venue_inquiries to authenticated;
grant all on public.venue_inquiries to service_role;

create policy venue_inquiries_admin_read on public.venue_inquiries for select to authenticated
  using (public.is_admin());
create policy venue_inquiries_admin_delete on public.venue_inquiries for delete to authenticated
  using (public.is_admin());
