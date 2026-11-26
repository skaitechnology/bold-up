// Pure search logic for the marketplace: filtering and distance sorting.
// Kept free of I/O so it can be unit-tested and later swapped for a PostGIS query.

import type { EventKind, VenueCategory } from "@/lib/domain";
import { distanceKm, type LatLng } from "@/lib/geo";

export type SportRef = { id: string; slug: string; name_fr: string; name_en: string; icon: string };

export type CoachLocation = "home" | "gym" | "outdoor" | "online";

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
  /** ISO weekdays (1 = Monday) on which the coach has opening hours. */
  weekdays: number[];
  /** Cheapest active service, in cents. Null when the coach has no active service. */
  minPriceCents: number | null;
  /** Distance from the search center. Null when the coach has no location. */
  distanceKm: number | null;
};

/** A place on the map: a gym or studio, a sports club, or a street workout spot. */
export type VenueCard = {
  id: string;
  slug: string;
  name: string;
  category: VenueCategory;
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
  /** Disciplines practised there (sports.slug). */
  sports: string[];
  /** Equipment and services: known keys (see PLACE_FEATURES) or free text. */
  facilities: string[];
  isFree: boolean;
  alwaysOpen: boolean;
  distanceKm: number | null;
};

export type EventCard = {
  id: string;
  slug: string;
  name: string;
  kind: EventKind;
  sportSlug: string | null;
  summary: string;
  /** Local dates, YYYY-MM-DD (Europe/Paris). */
  startsOn: string;
  endsOn: string | null;
  /** HH:MM, local time. */
  startTime: string | null;
  placeName: string | null;
  city: string | null;
  lat: number;
  lng: number;
  formats: string[];
  level: "all" | "beginner" | "intermediate" | "advanced";
  priceFromCents: number | null;
  isFree: boolean;
  isDemo: boolean;
  photoPath: string | null;
  distanceKm: number | null;
};

export type CoachSort = "distance" | "price";

export type CoachFilters = {
  sport?: string | null;
  center?: LatLng | null;
  radiusKm?: number | null;
  maxPriceCents?: number | null;
  /** Keep coaches who work on at least one of these ISO weekdays. */
  weekdays?: readonly number[] | null;
  location?: CoachLocation | null;
  sort?: CoachSort | null;
};

export const RADIUS_OPTIONS = [2, 5, 10, 20] as const;
export const PRICE_OPTIONS = [30, 40, 50, 60, 80] as const;

export function withDistance<T extends { lat: number | null; lng: number | null }>(item: T, center: LatLng | null | undefined) {
  const distance = center && item.lat != null && item.lng != null ? distanceKm(center, { lat: item.lat, lng: item.lng }) : null;
  return { ...item, distanceKm: distance };
}

const byDistance = (a: { distanceKm: number | null }, b: { distanceKm: number | null }) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);

function trainsAt(coach: CoachCard, location: CoachLocation): boolean {
  if (location === "home") return coach.atHome;
  if (location === "gym") return coach.atGym;
  if (location === "outdoor") return coach.outdoor;
  return coach.online;
}

/** Applies the filters, computes real distances from coordinates and sorts (nearest first by default). */
export function searchCoaches(coaches: CoachCard[], filters: CoachFilters): CoachCard[] {
  const { sport, center, radiusKm, maxPriceCents, weekdays, location, sort } = filters;
  return coaches
    .map((coach) => withDistance(coach, center))
    .filter((coach) => {
      if (sport && !coach.sports.some((s) => s.slug === sport)) return false;
      if (maxPriceCents != null && (coach.minPriceCents == null || coach.minPriceCents > maxPriceCents)) return false;
      if (radiusKm != null && center) {
        if (coach.distanceKm == null || coach.distanceKm > radiusKm) return false;
      }
      if (weekdays?.length && !weekdays.some((day) => coach.weekdays.includes(day))) return false;
      if (location && !trainsAt(coach, location)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "price") {
        const price = (a.minPriceCents ?? Infinity) - (b.minPriceCents ?? Infinity);
        if (price !== 0 && Number.isFinite(price)) return price;
        if (a.minPriceCents == null && b.minPriceCents != null) return 1;
        if (b.minPriceCents == null && a.minPriceCents != null) return -1;
      }
      if (a.distanceKm == null && b.distanceKm == null) return a.displayName.localeCompare(b.displayName);
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
}

export type VenueFilters = {
  center?: LatLng | null;
  radiusKm?: number | null;
  /** One category… */
  category?: string | null;
  /** …or a family of categories (gyms and studios, clubs, street workout spots). */
  categories?: readonly string[] | null;
  /** A discipline practised there. */
  sport?: string | null;
  /** Every one of these facilities must be present. */
  features?: readonly string[] | null;
  freeOnly?: boolean;
  alwaysOpenOnly?: boolean;
};

export function searchVenues(venues: VenueCard[], filters: VenueFilters): VenueCard[] {
  const { center, radiusKm, category, categories, sport, features, freeOnly, alwaysOpenOnly } = filters;
  return venues
    .map((venue) => withDistance(venue, center))
    .filter((venue) => {
      if (category && venue.category !== category) return false;
      if (categories && !categories.includes(venue.category)) return false;
      if (sport && !venue.sports.includes(sport)) return false;
      if (features?.length && !features.every((feature) => venue.facilities.includes(feature))) return false;
      if (freeOnly && !venue.isFree) return false;
      if (alwaysOpenOnly && !venue.alwaysOpen) return false;
      if (radiusKm != null && center && (venue.distanceKm == null || venue.distanceKm > radiusKm)) return false;
      return true;
    })
    .sort((a, b) => {
      // official partners first, then nearest
      if (a.partner !== b.partner) return a.partner ? -1 : 1;
      return byDistance(a, b);
    });
}

export type EventPeriod = "month" | "quarter";

export type EventFilters = {
  center?: LatLng | null;
  radiusKm?: number | null;
  kind?: string | null;
  sport?: string | null;
  /** Today as YYYY-MM-DD (Paris). Events that ended before it are left out. */
  today: string;
  /** Only events starting within the next 30 or 90 days. */
  period?: EventPeriod | null;
  freeOnly?: boolean;
  sort?: "date" | "distance";
};

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Upcoming events (still running or yet to start), soonest first by default. */
export function searchEvents(events: EventCard[], filters: EventFilters): EventCard[] {
  const { center, radiusKm, kind, sport, today, period, freeOnly, sort } = filters;
  const until = period ? addDays(today, period === "month" ? 30 : 90) : null;
  return events
    .map((event) => withDistance(event, center))
    .filter((event) => {
      if ((event.endsOn ?? event.startsOn) < today) return false;
      if (until && event.startsOn > until) return false;
      if (kind && event.kind !== kind) return false;
      if (sport && event.sportSlug !== sport) return false;
      if (freeOnly && !event.isFree) return false;
      if (radiusKm != null && center && (event.distanceKm == null || event.distanceKm > radiusKm)) return false;
      return true;
    })
    .sort((a, b) => (sort === "distance" ? byDistance(a, b) || a.startsOn.localeCompare(b.startsOn) : a.startsOn.localeCompare(b.startsOn) || byDistance(a, b)));
}

/** Whole days from `today` to a date key (0 = today). Negative when it has started. */
export function daysUntil(dateKey: string, today: string): number {
  const at = (key: string) => {
    const [y, m, d] = key.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((at(dateKey) - at(today)) / 86_400_000);
}
