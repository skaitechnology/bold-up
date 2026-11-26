import { intlLocale, type Locale } from "@/lib/i18n/config";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import type { CoachCard, EventCard, VenueCard } from "@/lib/search";
import type { MapMarker } from "./map-view";

/** A coach as a map pin: their portrait, ringed in the colour of their first discipline. */
export function coachMarker(coach: CoachCard, locale: Locale): MapMarker | null {
  if (coach.lat == null || coach.lng == null) return null;
  const sport = coach.sports[0];
  return {
    id: coach.id,
    kind: "coach",
    lat: coach.lat,
    lng: coach.lng,
    label: coach.minPriceCents != null ? formatPrice(coach.minPriceCents, locale) : "",
    title: coach.displayName,
    tone: sport?.slug ?? "coach",
    icon: sport?.icon,
    photo: mediaUrl(coach.photoPath),
  };
}

/** A gym, a club or a street workout spot. */
export function placeMarker(venue: VenueCard): MapMarker {
  const kind = venue.category === "club" ? "club" : venue.category === "street_workout" ? "street_workout" : "venue";
  return {
    id: venue.id,
    kind,
    lat: venue.lat,
    lng: venue.lng,
    label: "",
    title: venue.name,
    tone: venue.category,
    icon: venue.category,
    partner: venue.partner,
  };
}

/** "12 déc." from a YYYY-MM-DD key. Noon UTC keeps it on the same Paris day. */
export function shortDate(key: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
}

export function eventMarker(event: EventCard, locale: Locale): MapMarker {
  return {
    id: event.id,
    kind: "event",
    lat: event.lat,
    lng: event.lng,
    label: shortDate(event.startsOn, locale),
    title: event.name,
    tone: event.kind,
    icon: event.kind,
  };
}

export function buildMarkers(input: { coaches?: CoachCard[]; venues?: VenueCard[]; events?: EventCard[] }, locale: Locale): MapMarker[] {
  return [
    ...(input.venues ?? []).map(placeMarker),
    ...(input.events ?? []).map((event) => eventMarker(event, locale)),
    ...(input.coaches ?? []).map((coach) => coachMarker(coach, locale)).filter((marker): marker is MapMarker => marker !== null),
  ];
}
