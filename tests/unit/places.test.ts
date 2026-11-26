import { describe, expect, it } from "vitest";
import {
  buildClubUrl,
  buildSpotUrl,
  clubFilters,
  countClubFilters,
  countSpotFilters,
  parseClubParams,
  parseSpotParams,
  splitFacilities,
  spotFilters,
  toggleEquipment,
} from "@/components/places/params";
import { GYM_CATEGORIES, isGymCategory, isPlaceFeature, placeHref, PLACE_FEATURES } from "@/lib/domain";
import { findCommune } from "@/lib/geo";
import { getDictionary } from "@/lib/i18n";
import { searchVenues, type VenueCard } from "@/lib/search";

const place = (over: Partial<VenueCard>): VenueCard => ({
  id: over.slug ?? "p",
  slug: "p",
  name: "P",
  category: "gym",
  address: null,
  postalCode: null,
  city: "Créteil",
  lat: 48.7845,
  lng: 2.453,
  partner: false,
  claimed: false,
  isDemo: true,
  source: "demo",
  photoPath: null,
  sports: [],
  facilities: [],
  isFree: false,
  alwaysOpen: false,
  distanceKm: null,
  ...over,
});

const gym = place({ slug: "gym", category: "gym", facilities: ["Ring"] });
const studio = place({ slug: "studio", category: "studio" });
const boxing = place({ slug: "boxing", category: "club", sports: ["boxe", "preparation-physique"], facilities: ["competition", "leisure", "kids", "adults"] });
const yoga = place({ slug: "yoga", category: "club", sports: ["yoga", "pilates"], facilities: ["leisure", "adults", "accessible"], lat: 48.8473, lng: 2.4378 });
const lake = place({ slug: "lake", category: "street_workout", facilities: ["pull_up_bars", "parallel_bars", "rings", "water"], isFree: true });
const quay = place({ slug: "quay", category: "street_workout", facilities: ["pull_up_bars", "rings", "lighting"], isFree: true, alwaysOpen: true, lat: 48.7921, lng: 2.4138 });
const all = [gym, studio, boxing, yoga, lake, quay];
const slugs = (list: VenueCard[]) => list.map((item) => item.slug).sort();
const creteil = findCommune("Créteil")!;

describe("place filters", () => {
  it("keeps one family of categories", () => {
    expect(slugs(searchVenues(all, { categories: GYM_CATEGORIES }))).toEqual(["gym", "studio"]);
    expect(slugs(searchVenues(all, { categories: ["club"] }))).toEqual(["boxing", "yoga"]);
    expect(slugs(searchVenues(all, { categories: ["street_workout"] }))).toEqual(["lake", "quay"]);
    // a single category can still be asked for within a family
    expect(slugs(searchVenues(all, { categories: GYM_CATEGORIES, category: "studio" }))).toEqual(["studio"]);
    expect(searchVenues(all, { categories: ["club"], category: "gym" })).toEqual([]);
  });

  it("filters clubs by discipline", () => {
    expect(slugs(searchVenues(all, { categories: ["club"], sport: "boxe" }))).toEqual(["boxing"]);
    expect(slugs(searchVenues(all, { categories: ["club"], sport: "pilates" }))).toEqual(["yoga"]);
    expect(searchVenues(all, { categories: ["club"], sport: "natation" })).toEqual([]);
  });

  it("requires every requested facility", () => {
    expect(slugs(searchVenues(all, { categories: ["street_workout"], features: ["rings"] }))).toEqual(["lake", "quay"]);
    expect(slugs(searchVenues(all, { categories: ["street_workout"], features: ["rings", "parallel_bars"] }))).toEqual(["lake"]);
    expect(searchVenues(all, { categories: ["street_workout"], features: ["rings", "covered"] })).toEqual([]);
    expect(slugs(searchVenues(all, { categories: ["club"], features: ["kids", "competition"] }))).toEqual(["boxing"]);
    // an empty list is no filter at all
    expect(slugs(searchVenues(all, { categories: ["club"], features: [] }))).toEqual(["boxing", "yoga"]);
  });

  it("filters on free and round-the-clock access", () => {
    expect(slugs(searchVenues(all, { freeOnly: true }))).toEqual(["lake", "quay"]);
    expect(slugs(searchVenues(all, { alwaysOpenOnly: true }))).toEqual(["quay"]);
    expect(slugs(searchVenues(all, { categories: ["club"], freeOnly: true }))).toEqual([]);
  });

  it("combines with the radius and sorts nearest first", () => {
    const near = searchVenues(all, { categories: ["club"], center: creteil, radiusKm: 2 });
    expect(slugs(near)).toEqual(["boxing"]);
    const sorted = searchVenues(all, { categories: ["street_workout"], center: creteil });
    expect(sorted.map((item) => item.slug)).toEqual(["lake", "quay"]);
    expect(sorted[0]!.distanceKm).toBeLessThan(sorted[1]!.distanceKm!);
  });
});

describe("clubs URL", () => {
  it("round-trips the whole state", () => {
    const url = buildClubUrl({
      sport: "boxe",
      place: { name: "Vincennes", lat: 48.8475, lng: 2.4392 },
      radiusKm: 5,
      audience: "kids",
      practice: "competition",
      accessible: true,
    });
    expect(url).toContain("public=enfants");
    expect(url).toContain("pratique=competition");
    const state = parseClubParams(Object.fromEntries(new URL(url, "http://x").searchParams));
    expect(state).toEqual({
      sport: "boxe",
      place: { name: "Vincennes", lat: 48.8475, lng: 2.4392, isMe: false },
      radiusKm: 5,
      audience: "kids",
      practice: "competition",
      accessible: true,
    });
    expect(countClubFilters(state)).toBe(5);
  });

  it("starts empty and ignores invalid input", () => {
    expect(buildClubUrl({})).toBe("/clubs");
    const state = parseClubParams({ sport: "<script>", public: "tous", pratique: "pro", acces: "yes", rayon: "7" });
    expect(state.sport).toBeNull();
    expect(state.audience).toBeNull();
    expect(state.practice).toBeNull();
    expect(state.accessible).toBe(false);
    expect(state.radiusKm).toBeNull();
    expect(state.place.name).toBe("Créteil");
    expect(countClubFilters(state)).toBe(0);
  });

  it("turns the state into venue filters", () => {
    const state = parseClubParams({ sport: "yoga", public: "adultes", pratique: "loisir", acces: "1" });
    const filters = clubFilters(state);
    expect(filters.categories).toEqual(["club"]);
    expect(filters.features).toEqual(["adults", "leisure", "accessible"]);
    expect(slugs(searchVenues(all, filters))).toEqual(["yoga"]);
  });
});

describe("street workout URL", () => {
  it("round-trips the whole state", () => {
    const url = buildSpotUrl({
      equipment: ["rings", "pull_up_bars"],
      alwaysOpen: true,
      lighting: true,
      water: true,
      covered: true,
      place: { name: "Alfortville", lat: 48.79718, lng: 2.42152 },
      radiusKm: 10,
    });
    // canonical order, readable commas
    expect(url).toContain("equip=tractions,anneaux");
    const state = parseSpotParams(Object.fromEntries(new URL(url, "http://x").searchParams));
    expect(state).toEqual({
      equipment: ["pull_up_bars", "rings"],
      alwaysOpen: true,
      lighting: true,
      water: true,
      covered: true,
      place: { name: "Alfortville", lat: 48.79718, lng: 2.42152, isMe: false },
      radiusKm: 10,
    });
    expect(countSpotFilters(state)).toBe(7);
  });

  it("ignores unknown equipment and duplicates", () => {
    const state = parseSpotParams({ equip: "anneaux,sauna,anneaux,,tractions", ouvert: "0" });
    expect(state.equipment).toEqual(["pull_up_bars", "rings"]);
    expect(state.alwaysOpen).toBe(false);
    expect(buildSpotUrl({})).toBe("/street-workout");
  });

  it("toggles a piece of equipment and filters the spots", () => {
    const state = parseSpotParams({ equip: "anneaux" });
    expect(toggleEquipment(state, "parallel_bars")).toEqual(["rings", "parallel_bars"]);
    expect(toggleEquipment(state, "rings")).toEqual([]);
    expect(slugs(searchVenues(all, spotFilters(state)))).toEqual(["lake", "quay"]);
    expect(slugs(searchVenues(all, spotFilters(parseSpotParams({ equip: "anneaux", eclaire: "1" }))))).toEqual(["quay"]);
    expect(slugs(searchVenues(all, spotFilters(parseSpotParams({ ouvert: "1" }))))).toEqual(["quay"]);
    expect(slugs(searchVenues(all, spotFilters(parseSpotParams({ eau: "1" }))))).toEqual(["lake"]);
  });
});

describe("place vocabulary", () => {
  it("routes each category to its own page", () => {
    expect(placeHref({ category: "club", slug: "a" })).toBe("/club/a");
    expect(placeHref({ category: "street_workout", slug: "b" })).toBe("/street-workout/b");
    expect(placeHref({ category: "gym", slug: "c" })).toBe("/salle/c");
    expect(isGymCategory("studio")).toBe(true);
    expect(isGymCategory("club")).toBe(false);
    expect(isGymCategory("street_workout")).toBe(false);
  });

  it("separates known facilities from free text", () => {
    expect(splitFacilities(["Ring", "pull_up_bars", "Sauna", "kids"])).toEqual({ known: ["pull_up_bars", "kids"], other: ["Ring", "Sauna"] });
    expect(isPlaceFeature("rings")).toBe(true);
    expect(isPlaceFeature("Ring")).toBe(false);
  });

  it("has a French and an English label for every known facility", () => {
    for (const locale of ["fr", "en"] as const) {
      const labels = getDictionary(locale).places.features as Record<string, string>;
      for (const feature of PLACE_FEATURES) expect(labels[feature], `${locale}:${feature}`).toBeTruthy();
      expect(Object.keys(labels).sort()).toEqual([...PLACE_FEATURES].sort());
    }
  });
});
