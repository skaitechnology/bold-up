import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { VenueCard } from "@/lib/search";

/** Every published place (gyms and studios, clubs, street workout spots), as cards for lists and the map. */
export const listPublicVenues = cache(async (): Promise<VenueCard[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id, slug, name, category, address, postal_code, city, lat, lng, partner_status, claim_status, is_demo, source, photo_path, sports, facilities, is_free, always_open")
    .eq("is_published", true)
    .order("name");
  if (error) throw new Error(`listPublicVenues: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    partner: row.partner_status === "partner",
    claimed: row.claim_status === "claimed",
    isDemo: row.is_demo,
    source: row.source,
    photoPath: row.photo_path,
    sports: row.sports,
    facilities: row.facilities,
    isFree: row.is_free,
    alwaysOpen: row.always_open,
    distanceKm: null,
  }));
});

export const getVenueBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("venues").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getVenueBySlug: ${error.message}`);
  return data;
});
