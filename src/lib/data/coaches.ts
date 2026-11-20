import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CoachCard, SportRef } from "@/lib/search";

const CARD_COLUMNS =
  "id, slug, display_name, headline, city, lat, lng, photo_path, service_radius_km, at_home, at_gym, outdoor, online, years_experience, is_demo, coach_sports(sports(id, slug, name_fr, name_en, icon, sort_order)), coach_services(price_cents, is_active)";

type CardRow = {
  id: string;
  slug: string;
  display_name: string;
  headline: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  photo_path: string | null;
  service_radius_km: number;
  at_home: boolean;
  at_gym: boolean;
  outdoor: boolean;
  online: boolean;
  years_experience: number | null;
  is_demo: boolean;
  coach_sports: { sports: (SportRef & { sort_order: number }) | null }[];
  coach_services: { price_cents: number; is_active: boolean }[];
};

export function toCoachCard(row: CardRow): CoachCard {
  const sports = row.coach_sports
    .map((entry) => entry.sports)
    .filter((sport): sport is SportRef & { sort_order: number } => Boolean(sport))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ id, slug, name_fr, name_en, icon }) => ({ id, slug, name_fr, name_en, icon }));
  const prices = row.coach_services.filter((service) => service.is_active).map((service) => service.price_cents);
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    headline: row.headline,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    photoPath: row.photo_path,
    serviceRadiusKm: row.service_radius_km,
    atHome: row.at_home,
    atGym: row.at_gym,
    outdoor: row.outdoor,
    online: row.online,
    yearsExperience: row.years_experience,
    isDemo: row.is_demo,
    sports,
    minPriceCents: prices.length ? Math.min(...prices) : null,
    distanceKm: null,
  };
}

/**
 * Every coach visible on the marketplace: approved by an admin AND published.
 * The explicit filters matter: row level security also lets a coach read their own draft,
 * which must never leak into public listings.
 */
export const listPublicCoaches = cache(async (): Promise<CoachCard[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_profiles")
    .select(CARD_COLUMNS)
    .eq("is_published", true)
    .eq("verification_status", "approved")
    .order("display_name");
  if (error) throw new Error(`listPublicCoaches: ${error.message}`);
  return (data as unknown as CardRow[]).map(toCoachCard);
});

export const listCoachCardsByIds = cache(async (ids: string[]): Promise<CoachCard[]> => {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coach_profiles")
    .select(CARD_COLUMNS)
    .in("id", ids)
    .eq("is_published", true)
    .eq("verification_status", "approved");
  if (error) throw new Error(`listCoachCardsByIds: ${error.message}`);
  return (data as unknown as CardRow[]).map(toCoachCard);
});

export const listSports = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sports")
    .select("id, slug, name_fr, name_en, icon, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(`listSports: ${error.message}`);
  return data;
});

const PROFILE_COLUMNS =
  "id, slug, display_name, headline, bio, experience, years_experience, photo_path, city, postal_code, lat, lng, service_radius_km, at_home, at_gym, outdoor, online, levels, formats, training_school, instagram, website, slot_step_min, min_notice_hours, accepting_bookings, verification_status, is_published, verified_at, is_demo, coach_sports(sports(id, slug, name_fr, name_en, icon, sort_order)), coach_services(id, name, description, duration_min, price_cents, format, is_active, sort_order), coach_qualifications(id, kind, title, issuer, year_obtained, status, created_at), coach_media(id, path, sort_order), availability_rules(weekday, start_time, end_time)";

export type CoachProfile = NonNullable<Awaited<ReturnType<typeof getCoachBySlug>>>;

/**
 * Full coach profile by public slug. Row level security decides who may read it:
 * everyone for an approved and published profile, otherwise only the owner and admins.
 */
export const getCoachBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("coach_profiles").select(PROFILE_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getCoachBySlug: ${error.message}`);
  if (!data) return null;
  const sports = data.coach_sports
    .map((entry) => entry.sports)
    .filter((sport): sport is NonNullable<typeof sport> => Boolean(sport))
    .sort((a, b) => a.sort_order - b.sort_order);
  const services = [...data.coach_services].sort((a, b) => a.sort_order - b.sort_order || a.price_cents - b.price_cents);
  return { ...data, sports, services };
});

export const getFavoriteCoachIds = cache(async (userId: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("coach_id").eq("customer_id", userId);
  return (data ?? []).map((row) => row.coach_id);
});
