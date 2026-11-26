import "server-only";
import { cache } from "react";
import type { EventKind, EventLevel } from "@/lib/domain";
import type { EventCard } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

const CARD_COLUMNS =
  "id, slug, name, kind, sport_slug, summary, starts_on, ends_on, start_time, place_name, city, lat, lng, formats, level, price_from_cents, is_free, is_demo, photo_path";

/** Every published event, as cards for lists and the map. Past ones are filtered by `searchEvents`. */
export const listPublicEvents = cache(async (): Promise<EventCard[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select(CARD_COLUMNS).eq("is_published", true).order("starts_on");
  if (error) throw new Error(`listPublicEvents: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind as EventKind,
    sportSlug: row.sport_slug,
    summary: row.summary,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    placeName: row.place_name,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    formats: row.formats,
    level: row.level as EventLevel,
    priceFromCents: row.price_from_cents,
    isFree: row.is_free,
    isDemo: row.is_demo,
    photoPath: row.photo_path,
    distanceKm: null,
  }));
});

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEventBySlug>>>;

/** Full event by public slug. Row level security hides unpublished events from the public. */
export const getEventBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getEventBySlug: ${error.message}`);
  return data;
});

/** Every event, published or not, for the back office. Row level security lets only admins read drafts. */
export async function listEventsAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("*").order("starts_on", { ascending: true }).order("name");
  if (error) throw new Error(`listEventsAdmin: ${error.message}`);
  return data;
}
