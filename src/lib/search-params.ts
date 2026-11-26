// The discovery page keeps its whole state in the URL, so a search can be shared,
// bookmarked and rendered on the server. This file is the single reader/writer of that URL.

import { DEFAULT_PLACE, findCommune } from "@/lib/geo";
import { PRICE_OPTIONS, RADIUS_OPTIONS, type CoachLocation, type CoachSort } from "@/lib/search";

export type SearchPlace = { name: string; lat: number; lng: number; isMe?: boolean };

/** When the coach should be available: today, on weekdays, or at the weekend. */
export type Availability = "today" | "week" | "weekend";

export type SearchState = {
  sport: string | null;
  place: SearchPlace;
  radiusKm: number | null;
  /** Maximum price per session, in euros. */
  maxPrice: number | null;
  showVenues: boolean;
  availability: Availability | null;
  location: CoachLocation | null;
  sort: CoachSort;
};

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export const DEFAULT_SEARCH_PLACE: SearchPlace = { name: DEFAULT_PLACE.name, lat: DEFAULT_PLACE.lat, lng: DEFAULT_PLACE.lng };

// URL values are French, like the rest of the public URLs.
const AVAILABILITY_PARAM: Record<string, Availability> = { aujourdhui: "today", semaine: "week", weekend: "weekend" };
const LOCATION_PARAM: Record<string, CoachLocation> = { domicile: "home", salle: "gym", exterieur: "outdoor", visio: "online" };
const reverse = <T extends string>(map: Record<string, T>, value: T) => Object.keys(map).find((key) => map[key] === value);

/** Reads the place (city or "around me") from the URL. Shared by every listing page. */
export function parsePlace(params: RawParams): SearchPlace {
  const lat = Number(first(params.lat));
  const lng = Number(first(params.lng));
  const name = first(params.ville)?.slice(0, 80);
  // Metropolitan France bounding box: anything else is ignored.
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat > 41 && lat < 51.5 && lng > -5.5 && lng < 10) {
    return { name: name || DEFAULT_PLACE.name, lat, lng, isMe: first(params.moi) === "1" };
  }
  const commune = findCommune(name);
  return commune ? { name: commune.name, lat: commune.lat, lng: commune.lng } : DEFAULT_SEARCH_PLACE;
}

export function parseRadius(params: RawParams): number | null {
  const radius = Number(first(params.rayon));
  return (RADIUS_OPTIONS as readonly number[]).includes(radius) ? radius : null;
}

/** Writes the place and radius the way `parsePlace` / `parseRadius` read them. */
export function writePlace(params: URLSearchParams, place: SearchPlace | undefined, radiusKm?: number | null) {
  if (place && (place.isMe || place.name !== DEFAULT_PLACE.name)) {
    params.set("ville", place.name);
    params.set("lat", place.lat.toFixed(5));
    params.set("lng", place.lng.toFixed(5));
    if (place.isMe) params.set("moi", "1");
  }
  if (radiusKm) params.set("rayon", String(radiusKm));
}

export function parseSearchParams(params: RawParams): SearchState {
  const sport = first(params.sport)?.match(/^[a-z0-9-]{2,40}$/)?.[0] ?? null;
  const price = Number(first(params.prix));
  return {
    sport,
    place: parsePlace(params),
    radiusKm: parseRadius(params),
    maxPrice: (PRICE_OPTIONS as readonly number[]).includes(price) ? price : null,
    showVenues: first(params.salles) !== "0",
    availability: AVAILABILITY_PARAM[first(params.dispo) ?? ""] ?? null,
    location: LOCATION_PARAM[first(params.lieu) ?? ""] ?? null,
    sort: first(params.tri) === "prix" ? "price" : "distance",
  };
}

export function buildSearchUrl(state: Partial<SearchState>, base = "/coachs"): string {
  const params = new URLSearchParams();
  if (state.sport) params.set("sport", state.sport);
  writePlace(params, state.place, state.radiusKm);
  if (state.maxPrice) params.set("prix", String(state.maxPrice));
  if (state.showVenues === false) params.set("salles", "0");
  if (state.availability) params.set("dispo", reverse(AVAILABILITY_PARAM, state.availability)!);
  if (state.location) params.set("lieu", reverse(LOCATION_PARAM, state.location)!);
  if (state.sort === "price") params.set("tri", "prix");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** ISO weekdays (1 = Monday) matching an availability filter, given today's weekday. */
export function availabilityWeekdays(availability: Availability | null, todayWeekday: number): number[] | null {
  if (availability === "today") return [todayWeekday];
  if (availability === "week") return [1, 2, 3, 4, 5];
  if (availability === "weekend") return [6, 7];
  return null;
}
