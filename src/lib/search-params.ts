// The discovery page keeps its whole state in the URL, so a search can be shared,
// bookmarked and rendered on the server. This file is the single reader/writer of that URL.

import { DEFAULT_PLACE, findCommune } from "@/lib/geo";
import { PRICE_OPTIONS, RADIUS_OPTIONS } from "@/lib/search";

export type SearchPlace = { name: string; lat: number; lng: number; isMe?: boolean };

export type SearchState = {
  sport: string | null;
  place: SearchPlace;
  radiusKm: number | null;
  /** Maximum price per session, in euros. */
  maxPrice: number | null;
  showVenues: boolean;
};

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export const DEFAULT_SEARCH_PLACE: SearchPlace = { name: DEFAULT_PLACE.name, lat: DEFAULT_PLACE.lat, lng: DEFAULT_PLACE.lng };

export function parseSearchParams(params: RawParams): SearchState {
  const sport = first(params.sport)?.match(/^[a-z0-9-]{2,40}$/)?.[0] ?? null;

  const lat = Number(first(params.lat));
  const lng = Number(first(params.lng));
  const name = first(params.ville)?.slice(0, 80);
  let place = DEFAULT_SEARCH_PLACE;
  // Metropolitan France bounding box: anything else is ignored.
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat > 41 && lat < 51.5 && lng > -5.5 && lng < 10) {
    place = { name: name || DEFAULT_PLACE.name, lat, lng, isMe: first(params.moi) === "1" };
  } else {
    const commune = findCommune(name);
    if (commune) place = { name: commune.name, lat: commune.lat, lng: commune.lng };
  }

  const radius = Number(first(params.rayon));
  const price = Number(first(params.prix));
  return {
    sport,
    place,
    radiusKm: (RADIUS_OPTIONS as readonly number[]).includes(radius) ? radius : null,
    maxPrice: (PRICE_OPTIONS as readonly number[]).includes(price) ? price : null,
    showVenues: first(params.salles) !== "0",
  };
}

export function buildSearchUrl(state: Partial<SearchState>, base = "/coachs"): string {
  const params = new URLSearchParams();
  if (state.sport) params.set("sport", state.sport);
  if (state.place && (state.place.isMe || state.place.name !== DEFAULT_PLACE.name)) {
    params.set("ville", state.place.name);
    params.set("lat", state.place.lat.toFixed(5));
    params.set("lng", state.place.lng.toFixed(5));
    if (state.place.isMe) params.set("moi", "1");
  }
  if (state.radiusKm) params.set("rayon", String(state.radiusKm));
  if (state.maxPrice) params.set("prix", String(state.maxPrice));
  if (state.showVenues === false) params.set("salles", "0");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
