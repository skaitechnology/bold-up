// Pure search logic for the marketplace: filtering and distance sorting.
// Kept free of I/O so it can be unit-tested and later swapped for a PostGIS query.

import { distanceKm, type LatLng } from "@/lib/geo";

export type SportRef = { id: string; slug: string; name_fr: string; name_en: string; icon: string };

export type CoachCard = {
  id: string;
  slug: string;
  displayName: string;
  headline: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  photoPath: string | null;
  serviceRadiusKm: number;
  atHome: boolean;
  atGym: boolean;
  outdoor: boolean;
  online: boolean;
  yearsExperience: number | null;
  isDemo: boolean;
  sports: SportRef[];
  /** Cheapest active service, in cents. Null when the coach has no active service. */
  minPriceCents: number | null;
  /** Distance from the search center. Null when the coach has no location. */
  distanceKm: number | null;
};

export type VenueCard = {
  id: string;
  slug: string;
  name: string;
  category: "gym" | "studio" | "shop" | "school" | "other";
  address: string | null;
  postalCode: string | null;
  city: string | null;
  lat: number;
  lng: number;
  partner: boolean;
  claimed: boolean;
  isDemo: boolean;
  source: string;
  photoPath: string | null;
  distanceKm: number | null;
};

export type CoachFilters = {
  sport?: string | null;
  center?: LatLng | null;
  radiusKm?: number | null;
  maxPriceCents?: number | null;
};

export const RADIUS_OPTIONS = [2, 5, 10, 20] as const;
export const PRICE_OPTIONS = [30, 40, 50, 60, 80] as const;

export function withDistance<T extends { lat: number | null; lng: number | null }>(item: T, center: LatLng | null | undefined) {
  const distance = center && item.lat != null && item.lng != null ? distanceKm(center, { lat: item.lat, lng: item.lng }) : null;
  return { ...item, distanceKm: distance };
}

/** Applies the filters, computes real distances from coordinates and sorts nearest first. */
export function searchCoaches(coaches: CoachCard[], filters: CoachFilters): CoachCard[] {
  const { sport, center, radiusKm, maxPriceCents } = filters;
  return coaches
    .map((coach) => withDistance(coach, center))
    .filter((coach) => {
      if (sport && !coach.sports.some((s) => s.slug === sport)) return false;
      if (maxPriceCents != null && (coach.minPriceCents == null || coach.minPriceCents > maxPriceCents)) return false;
      if (radiusKm != null && center) {
        if (coach.distanceKm == null || coach.distanceKm > radiusKm) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return a.displayName.localeCompare(b.displayName);
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
}

export function searchVenues(venues: VenueCard[], filters: { center?: LatLng | null; radiusKm?: number | null; category?: string | null }): VenueCard[] {
  const { center, radiusKm, category } = filters;
  return venues
    .map((venue) => withDistance(venue, center))
    .filter((venue) => {
      if (category && venue.category !== category) return false;
      if (radiusKm != null && center && (venue.distanceKm == null || venue.distanceKm > radiusKm)) return false;
      return true;
    })
    .sort((a, b) => {
      // official partners first, then nearest
      if (a.partner !== b.partner) return a.partner ? -1 : 1;
      return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    });
}
