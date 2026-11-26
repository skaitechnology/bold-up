// URL state of the two place listings (/clubs and /street-workout).
// Like the coach search, every filter lives in the URL so a search can be shared,
// bookmarked and rendered on the server. Pure functions: no I/O, unit-tested.

import { CLUB_FEATURES, SPOT_FEATURES, type PlaceFeature } from "@/lib/domain";
import type { VenueFilters } from "@/lib/search";
import { parsePlace, parseRadius, writePlace, type SearchPlace } from "@/lib/search-params";

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const reverse = <T extends string>(map: Record<string, T>, value: T) => Object.keys(map).find((key) => map[key] === value);

// ---------------------------------------------------------------- clubs

export type ClubAudience = "kids" | "adults";
export type ClubPractice = "competition" | "leisure";

export type ClubState = {
  sport: string | null;
  place: SearchPlace;
  radiusKm: number | null;
  audience: ClubAudience | null;
  practice: ClubPractice | null;
  accessible: boolean;
};

// URL values are French, like the rest of the public URLs.
const AUDIENCE_PARAM: Record<string, ClubAudience> = { enfants: "kids", adultes: "adults" };
const PRACTICE_PARAM: Record<string, ClubPractice> = { competition: "competition", loisir: "leisure" };

export const CLUB_AUDIENCES: readonly ClubAudience[] = ["kids", "adults"];
export const CLUB_PRACTICES: readonly ClubPractice[] = ["leisure", "competition"];

export function parseClubParams(params: RawParams): ClubState {
  return {
    sport: first(params.sport)?.match(/^[a-z0-9-]{2,40}$/)?.[0] ?? null,
    place: parsePlace(params),
    radiusKm: parseRadius(params),
    audience: AUDIENCE_PARAM[first(params.public) ?? ""] ?? null,
    practice: PRACTICE_PARAM[first(params.pratique) ?? ""] ?? null,
    accessible: first(params.acces) === "1",
  };
}

export function buildClubUrl(state: Partial<ClubState>, base = "/clubs"): string {
  const params = new URLSearchParams();
  if (state.sport) params.set("sport", state.sport);
  writePlace(params, state.place, state.radiusKm);
  if (state.audience) params.set("public", reverse(AUDIENCE_PARAM, state.audience)!);
  if (state.practice) params.set("pratique", reverse(PRACTICE_PARAM, state.practice)!);
  if (state.accessible) params.set("acces", "1");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** The facilities a club must have to match the audience / practice / accessibility filters. */
export function clubFeatures(state: Pick<ClubState, "audience" | "practice" | "accessible">): PlaceFeature[] {
  const features: PlaceFeature[] = [];
  if (state.audience) features.push(state.audience);
  if (state.practice) features.push(state.practice);
  if (state.accessible) features.push("accessible");
  return features;
}

export function clubFilters(state: ClubState): VenueFilters {
  return { categories: ["club"], center: state.place, radiusKm: state.radiusKm, sport: state.sport, features: clubFeatures(state) };
}

export function countClubFilters(state: ClubState): number {
  return (state.sport ? 1 : 0) + (state.radiusKm ? 1 : 0) + (state.audience ? 1 : 0) + (state.practice ? 1 : 0) + (state.accessible ? 1 : 0);
}

// ---------------------------------------------------------------- street workout

/** The apparatus a visitor can ask for (several at once: the spot must have them all). */
export const SPOT_EQUIPMENT = ["pull_up_bars", "parallel_bars", "monkey_bars", "rings", "abs_bench", "stall_bars"] as const satisfies readonly PlaceFeature[];
export type SpotEquipment = (typeof SPOT_EQUIPMENT)[number];

export type SpotState = {
  equipment: SpotEquipment[];
  alwaysOpen: boolean;
  lighting: boolean;
  water: boolean;
  covered: boolean;
  place: SearchPlace;
  radiusKm: number | null;
};

const EQUIPMENT_PARAM: Record<string, SpotEquipment> = {
  tractions: "pull_up_bars",
  paralleles: "parallel_bars",
  singe: "monkey_bars",
  anneaux: "rings",
  abdos: "abs_bench",
  espalier: "stall_bars",
};

export function parseSpotParams(params: RawParams): SpotState {
  const wanted = (first(params.equip) ?? "")
    .split(",")
    .map((key) => EQUIPMENT_PARAM[key.trim()])
    .filter((value): value is SpotEquipment => Boolean(value));
  return {
    // canonical order, no duplicates
    equipment: SPOT_EQUIPMENT.filter((item) => wanted.includes(item)),
    alwaysOpen: first(params.ouvert) === "1",
    lighting: first(params.eclaire) === "1",
    water: first(params.eau) === "1",
    covered: first(params.abrite) === "1",
    place: parsePlace(params),
    radiusKm: parseRadius(params),
  };
}

export function buildSpotUrl(state: Partial<SpotState>, base = "/street-workout"): string {
  const params = new URLSearchParams();
  const equipment = SPOT_EQUIPMENT.filter((item) => state.equipment?.includes(item));
  if (equipment.length) params.set("equip", equipment.map((item) => reverse(EQUIPMENT_PARAM, item)!).join(","));
  if (state.alwaysOpen) params.set("ouvert", "1");
  if (state.lighting) params.set("eclaire", "1");
  if (state.water) params.set("eau", "1");
  if (state.covered) params.set("abrite", "1");
  writePlace(params, state.place, state.radiusKm);
  const query = params.toString();
  // commas read better than %2C in a shared link
  return query ? `${base}?${query.replace(/%2C/g, ",")}` : base;
}

export function toggleEquipment(state: SpotState, item: SpotEquipment): SpotEquipment[] {
  return state.equipment.includes(item) ? state.equipment.filter((value) => value !== item) : [...state.equipment, item];
}

export function spotFeatures(state: Pick<SpotState, "equipment" | "lighting" | "water" | "covered">): PlaceFeature[] {
  const features: PlaceFeature[] = [...state.equipment];
  if (state.lighting) features.push("lighting");
  if (state.water) features.push("water");
  if (state.covered) features.push("covered");
  return features;
}

export function spotFilters(state: SpotState): VenueFilters {
  return { categories: ["street_workout"], center: state.place, radiusKm: state.radiusKm, features: spotFeatures(state), alwaysOpenOnly: state.alwaysOpen };
}

export function countSpotFilters(state: SpotState): number {
  return state.equipment.length + (state.alwaysOpen ? 1 : 0) + (state.lighting ? 1 : 0) + (state.water ? 1 : 0) + (state.covered ? 1 : 0) + (state.radiusKm ? 1 : 0);
}

// ---------------------------------------------------------------- shared

/** Splits a facility list into the ones we know how to label and the free text ones. */
export function splitFacilities(facilities: readonly string[]) {
  const known = [...SPOT_FEATURES, ...CLUB_FEATURES] as readonly string[];
  return {
    known: facilities.filter((item): item is PlaceFeature => known.includes(item)),
    other: facilities.filter((item) => !known.includes(item)),
  };
}
