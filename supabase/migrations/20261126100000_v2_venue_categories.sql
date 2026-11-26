-- BOLD UP V2 — two new kinds of places: sports clubs and street workout spots.
-- Kept in its own migration: a new enum value cannot be used in the transaction that adds it.

alter type public.venue_category add value if not exists 'club';
alter type public.venue_category add value if not exists 'street_workout';
