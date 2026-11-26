import { describe, expect, it } from "vitest";
import { buildIcs, icsEscape, icsFold } from "@/components/events/ics";
import { buildEventsUrl, countdownLabel, dateTile, eventCountdown, eventDateLabel, fullDate, hasEventFilters, parseEventParams } from "@/components/events/utils";
import { getDictionary } from "@/lib/i18n";
import { daysUntil, searchEvents, type EventCard } from "@/lib/search";

const TODAY = "2026-11-26";
const CRETEIL = { lat: 48.78451, lng: 2.45298 };

const event = (over: Partial<EventCard>): EventCard => ({
  id: over.slug ?? "e",
  slug: "e",
  name: "Évènement",
  kind: "local",
  sportSlug: null,
  summary: "",
  startsOn: "2026-12-05",
  endsOn: null,
  startTime: null,
  placeName: null,
  city: "Créteil",
  lat: CRETEIL.lat,
  lng: CRETEIL.lng,
  formats: [],
  level: "all",
  priceFromCents: null,
  isFree: false,
  isDemo: true,
  photoPath: null,
  distanceKm: null,
  ...over,
});

const slugs = (list: EventCard[]) => list.map((item) => item.slug);

describe("event search", () => {
  it("never shows an event that is over, but keeps one that is still running", () => {
    const past = event({ slug: "past", startsOn: "2026-11-20" });
    const endedYesterday = event({ slug: "ended", startsOn: "2026-11-24", endsOn: "2026-11-25" });
    const running = event({ slug: "running", startsOn: "2026-11-25", endsOn: "2026-11-27" });
    const today = event({ slug: "today", startsOn: TODAY });
    expect(slugs(searchEvents([past, endedYesterday, running, today], { today: TODAY }))).toEqual(["running", "today"]);
  });

  it("sorts by date by default, and by distance on request", () => {
    const soonFar = event({ slug: "soon-far", startsOn: "2026-12-01", lat: 48.8322, lng: 2.2876 });
    const laterNear = event({ slug: "later-near", startsOn: "2026-12-20" });
    expect(slugs(searchEvents([laterNear, soonFar], { today: TODAY, center: CRETEIL }))).toEqual(["soon-far", "later-near"]);
    expect(slugs(searchEvents([soonFar, laterNear], { today: TODAY, center: CRETEIL, sort: "distance" }))).toEqual(["later-near", "soon-far"]);
  });

  it("filters by period: the next 30 days or the next 3 months", () => {
    const inTwoWeeks = event({ slug: "two-weeks", startsOn: "2026-12-10" });
    const inTwoMonths = event({ slug: "two-months", startsOn: "2027-01-25" });
    const inFourMonths = event({ slug: "four-months", startsOn: "2027-03-28" });
    const all = [inTwoWeeks, inTwoMonths, inFourMonths];
    expect(slugs(searchEvents(all, { today: TODAY, period: "month" }))).toEqual(["two-weeks"]);
    expect(slugs(searchEvents(all, { today: TODAY, period: "quarter" }))).toEqual(["two-weeks", "two-months"]);
    expect(searchEvents(all, { today: TODAY })).toHaveLength(3);
  });

  it("filters by type, discipline, price and radius", () => {
    const trail = event({ slug: "trail", kind: "trail", sportSlug: "running", lat: 48.8425, lng: 2.4357 });
    const boxing = event({ slug: "boxing", kind: "competition", sportSlug: "boxe" });
    const free = event({ slug: "free", isFree: true });
    const paris = event({ slug: "paris", kind: "hyrox", lat: 48.8322, lng: 2.2876 });
    const all = [trail, boxing, free, paris];
    expect(slugs(searchEvents(all, { today: TODAY, kind: "trail" }))).toEqual(["trail"]);
    expect(slugs(searchEvents(all, { today: TODAY, sport: "boxe" }))).toEqual(["boxing"]);
    expect(slugs(searchEvents(all, { today: TODAY, freeOnly: true }))).toEqual(["free"]);
    // Porte de Versailles is about 13 km from Créteil, Vincennes about 6.5 km
    expect(slugs(searchEvents(all, { today: TODAY, center: CRETEIL, radiusKm: 10 })).sort()).toEqual(["boxing", "free", "trail"]);
    expect(slugs(searchEvents(all, { today: TODAY, center: CRETEIL, radiusKm: 5 })).sort()).toEqual(["boxing", "free"]);
  });

  it("computes real distances from the search center", () => {
    const [found] = searchEvents([event({ lat: 48.8425, lng: 2.4357 })], { today: TODAY, center: CRETEIL });
    expect(found?.distanceKm).toBeGreaterThan(6);
    expect(found?.distanceKm).toBeLessThan(7);
  });

  it("counts whole days between two calendar dates", () => {
    expect(daysUntil(TODAY, TODAY)).toBe(0);
    expect(daysUntil("2026-11-27", TODAY)).toBe(1);
    expect(daysUntil("2026-12-08", TODAY)).toBe(12);
    expect(daysUntil("2026-11-24", TODAY)).toBe(-2);
    // across the end-of-October clock change and the new year
    expect(daysUntil("2026-10-26", "2026-10-24")).toBe(2);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
  });
});

describe("events URL", () => {
  it("round-trips every filter", () => {
    const url = buildEventsUrl({
      kind: "trail",
      sport: "running",
      period: "quarter",
      place: { name: "Vincennes", lat: 48.8475, lng: 2.4392 },
      radiusKm: 10,
      freeOnly: true,
      sort: "distance",
    });
    expect(url.startsWith("/evenements?")).toBe(true);
    const params = Object.fromEntries(new URL(url, "http://x").searchParams);
    expect(params).toMatchObject({ type: "trail", periode: "3mois", rayon: "10", gratuit: "1", tri: "distance" });
    expect(parseEventParams(params)).toEqual({
      kind: "trail",
      sport: "running",
      period: "quarter",
      place: { name: "Vincennes", lat: 48.8475, lng: 2.4392, isMe: false },
      radiusKm: 10,
      freeOnly: true,
      sort: "distance",
    });
  });

  it("has a clean default URL and ignores invalid input", () => {
    expect(buildEventsUrl({})).toBe("/evenements");
    expect(buildEventsUrl({ kind: "hyrox" })).toBe("/evenements?type=hyrox");
    expect(buildEventsUrl({ period: "month" })).toBe("/evenements?periode=30j");
    const state = parseEventParams({ type: "<script>", periode: "7j", rayon: "7", gratuit: "yes", tri: "prix", sport: "A B" });
    expect(state).toMatchObject({ kind: null, sport: null, period: null, radiusKm: null, freeOnly: false, sort: "date" });
    expect(state.place.name).toBe("Créteil");
    expect(hasEventFilters(state)).toBe(false);
    expect(hasEventFilters({ ...state, kind: "trail" })).toBe(true);
  });
});

describe("event dates", () => {
  const fr = getDictionary("fr").events;
  const en = getDictionary("en").events;

  it("builds the date block", () => {
    expect(dateTile("2026-12-05", "fr")).toEqual({ day: "5", month: "déc", weekday: "sam" });
    expect(dateTile("2026-12-05", "en")).toEqual({ day: "5", month: "Dec", weekday: "Sat" });
  });

  it("labels a single day and a range", () => {
    expect(eventDateLabel({ startsOn: "2026-12-05", endsOn: null }, "fr", fr.dateRange)).toBe("samedi 5 décembre");
    expect(eventDateLabel({ startsOn: "2026-12-05", endsOn: "2026-12-05" }, "fr", fr.dateRange)).toBe("samedi 5 décembre");
    expect(eventDateLabel({ startsOn: "2026-12-05", endsOn: "2026-12-06" }, "fr", fr.dateRange)).toBe("du sam. 5 déc. au dim. 6 déc.");
    expect(fullDate("2026-12-05", "fr")).toBe("samedi 5 décembre 2026");
  });

  it("counts down to the start, in both languages", () => {
    const label = (startsOn: string, endsOn: string | null = null) => countdownLabel(eventCountdown({ startsOn, endsOn }, TODAY), fr.countdown);
    expect(label(TODAY)).toBe("Aujourd'hui");
    expect(label("2026-11-27")).toBe("Demain");
    expect(label("2026-12-08")).toBe("J-12");
    expect(label("2026-11-25", "2026-11-27")).toBe("En cours");
    expect(label("2026-11-20")).toBeNull();
    expect(countdownLabel(eventCountdown({ startsOn: "2026-12-08", endsOn: null }, TODAY), en.countdown)).toBe("In 12 days");
  });
});

describe("calendar file (.ics)", () => {
  const labels = getDictionary("fr").events.ics;
  const base = {
    slug: "les-10-km-de-creteil",
    name: "Les 10 km de Créteil",
    summary: "Une boucle plate, rapide; record possible.",
    startsOn: "2026-12-13",
    endsOn: null,
    startTime: "09:30",
    placeName: "Départ : Hôtel de ville",
    address: null,
    postalCode: "94000",
    city: "Créteil",
    lat: 48.7772,
    lng: 2.4575,
    formats: ["10 km", "5 km"],
    isDemo: false,
  };
  const options = { url: "https://bold-up.vercel.app/evenement/les-10-km-de-creteil", labels, now: new Date("2026-11-26T10:15:00Z") };

  it("writes an all-day event on the local date, with an exclusive end", () => {
    const ics = buildIcs(base, options);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:les-10-km-de-creteil@boldup");
    expect(ics).toContain("DTSTAMP:20261126T101500Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261213");
    expect(ics).toContain("DTEND;VALUE=DATE:20261214");
    expect(ics).toContain("SUMMARY:Les 10 km de Créteil");
    expect(ics).toContain("GEO:48.77720;2.45750");
    const multi = buildIcs({ ...base, startsOn: "2026-12-31", endsOn: "2027-01-01" }, options);
    expect(multi).toContain("DTSTART;VALUE=DATE:20261231");
    expect(multi).toContain("DTEND;VALUE=DATE:20270102");
  });

  it("escapes text and gives the start time in the description", () => {
    const unfolded = buildIcs(base, options).replace(/\r\n /g, "");
    expect(unfolded).toContain("LOCATION:Départ : Hôtel de ville\\, 94000 Créteil");
    expect(unfolded).toContain("Une boucle plate\\, rapide\\; record possible.");
    expect(unfolded).toContain("Départ à 09:30 (heure de Paris).");
    expect(unfolded).toContain("Formats : 10 km\\, 5 km.");
    expect(icsEscape("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });

  it("labels fictional events as such in the calendar entry", () => {
    const unfolded = buildIcs({ ...base, isDemo: true }, options).replace(/\r\n /g, "");
    expect(unfolded).toContain("SUMMARY:[Démo] Les 10 km de Créteil");
    expect(unfolded).toContain(labels.demoNote.replace(/,/g, "\\,"));
  });

  it("folds long lines to 75 octets without cutting a character in half", () => {
    const line = `DESCRIPTION:${"é".repeat(120)}`;
    const folded = icsFold(line);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n").length).toBeGreaterThan(1);
    expect(folded.replace(/\r\n /g, "")).toBe(line);
    for (const part of buildIcs(base, options).trimEnd().split("\r\n")) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
  });
});
