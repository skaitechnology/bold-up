import { describe, expect, it } from "vitest";
import { COMMUNES, DEFAULT_PLACE, distanceKm, findCommune, jitter, searchCommunes } from "@/lib/geo";
import { searchCoaches, searchVenues, type CoachCard, type VenueCard } from "@/lib/search";
import { buildSearchUrl, parseSearchParams } from "@/lib/search-params";

const coach = (over: Partial<CoachCard>): CoachCard => ({
  id: over.slug ?? "id",
  slug: "slug",
  displayName: "Coach",
  headline: "",
  city: "Créteil",
  lat: 48.7845,
  lng: 2.453,
  photoPath: null,
  serviceRadiusKm: 5,
  atHome: false,
  atGym: true,
  outdoor: false,
  online: false,
  yearsExperience: null,
  isDemo: true,
  sports: [{ id: "s1", slug: "boxe", name_fr: "Boxe", name_en: "Boxing", icon: "boxing" }],
  minPriceCents: 5000,
  distanceKm: null,
  ...over,
});

describe("distance", () => {
  const creteil = findCommune("Créteil")!;
  const paris = findCommune("Paris")!;
  it("is computed from real coordinates", () => {
    expect(distanceKm(creteil, creteil)).toBe(0);
    const d = distanceKm(creteil, paris);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(13);
    expect(distanceKm(paris, creteil)).toBeCloseTo(d, 6);
  });
  it("keeps a jittered coach location close to the town and stable for the same coach", () => {
    const a = jitter(creteil, "coach-a");
    expect(distanceKm(creteil, a)).toBeLessThanOrEqual(0.72);
    expect(distanceKm(creteil, a)).toBeGreaterThan(0.1);
    expect(jitter(creteil, "coach-a")).toEqual(a);
    expect(jitter(creteil, "coach-b")).not.toEqual(a);
  });
});

describe("town suggestions", () => {
  it("starts from Créteil, the launch town", () => {
    expect(DEFAULT_PLACE.name).toBe("Créteil");
    expect(COMMUNES.length).toBeGreaterThan(20);
  });
  it("matches names without accents and postcodes", () => {
    expect(searchCommunes("creteil")[0]?.name).toBe("Créteil");
    expect(searchCommunes("94700")[0]?.name).toBe("Maisons-Alfort");
    expect(searchCommunes("saint maur")[0]?.name).toBe("Saint-Maur-des-Fossés");
    expect(searchCommunes("zzzz")).toEqual([]);
  });
});

describe("coach search", () => {
  const center = { lat: 48.7845, lng: 2.453 };
  const near = coach({ slug: "near", displayName: "Near" });
  const far = coach({ slug: "far", displayName: "Far", lat: 48.859, lng: 2.347, minPriceCents: 3000 });
  const yoga = coach({ slug: "yoga", displayName: "Yoga", sports: [{ id: "s2", slug: "yoga", name_fr: "Yoga", name_en: "Yoga", icon: "flower" }] });
  const nowhere = coach({ slug: "nowhere", displayName: "Nowhere", lat: null, lng: null });

  it("sorts nearest first and puts coaches without a location last", () => {
    expect(searchCoaches([nowhere, far, near], { center }).map((c) => c.slug)).toEqual(["near", "far", "nowhere"]);
  });
  it("filters by sport", () => {
    expect(searchCoaches([near, yoga], { center, sport: "yoga" }).map((c) => c.slug)).toEqual(["yoga"]);
  });
  it("filters by distance using the computed distance", () => {
    const result = searchCoaches([near, far, nowhere], { center, radiusKm: 5 });
    expect(result.map((c) => c.slug)).toEqual(["near"]);
    expect(result[0]?.distanceKm).toBeLessThan(0.01);
  });
  it("filters by maximum price", () => {
    expect(searchCoaches([near, far], { center, maxPriceCents: 4000 }).map((c) => c.slug)).toEqual(["far"]);
    expect(searchCoaches([coach({ slug: "free", minPriceCents: null })], { center, maxPriceCents: 4000 })).toEqual([]);
  });
});

describe("venue search", () => {
  const venue = (over: Partial<VenueCard>): VenueCard => ({
    id: over.slug ?? "v",
    slug: "v",
    name: "V",
    category: "gym",
    address: null,
    postalCode: null,
    city: "Créteil",
    lat: 48.79,
    lng: 2.45,
    partner: false,
    claimed: false,
    isDemo: false,
    source: "osm",
    photoPath: null,
    distanceKm: null,
    ...over,
  });
  it("lists official partners first, then by distance", () => {
    const result = searchVenues([venue({ slug: "a" }), venue({ slug: "partner", partner: true, lat: 48.85, lng: 2.35 })], { center: { lat: 48.7845, lng: 2.453 } });
    expect(result.map((v) => v.slug)).toEqual(["partner", "a"]);
  });
});

describe("search URL", () => {
  it("round-trips the whole search state", () => {
    const url = buildSearchUrl({ sport: "boxe", place: { name: "Vincennes", lat: 48.8475, lng: 2.4392 }, radiusKm: 5, maxPrice: 50, showVenues: false });
    const params = Object.fromEntries(new URL(url, "http://x").searchParams);
    expect(parseSearchParams(params)).toEqual({
      sport: "boxe",
      place: { name: "Vincennes", lat: 48.8475, lng: 2.4392, isMe: false },
      radiusKm: 5,
      maxPrice: 50,
      showVenues: false,
    });
  });
  it("defaults to Créteil and ignores invalid input", () => {
    const state = parseSearchParams({ sport: "<script>", lat: "999", lng: "abc", rayon: "7", prix: "-1" });
    expect(state.place.name).toBe("Créteil");
    expect(state).toMatchObject({ sport: null, radiusKm: null, maxPrice: null, showVenues: true });
    expect(buildSearchUrl({})).toBe("/coachs");
  });
  it("accepts a known town by name alone", () => {
    expect(parseSearchParams({ ville: "Vincennes" }).place.lat).toBeCloseTo(48.847, 2);
  });
});
