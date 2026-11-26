// Pure helpers for the events pages: the listing URL, date labels and the countdown.
// No I/O and no React here, so everything is unit-testable.

import { EVENT_KINDS, type EventKind } from "@/lib/domain";
import { formatDateKey } from "@/lib/format";
import { intlLocale, type Locale } from "@/lib/i18n/config";
import { daysUntil, type EventPeriod } from "@/lib/search";
import { parsePlace, parseRadius, writePlace, type SearchPlace } from "@/lib/search-params";

export type EventSort = "date" | "distance";

/** Everything the /evenements page can be filtered and sorted by. It all lives in the URL. */
export type EventsState = {
  kind: EventKind | null;
  /** A discipline (sports.slug), e.g. when coming from a coach or a sport page. */
  sport: string | null;
  period: EventPeriod | null;
  place: SearchPlace;
  radiusKm: number | null;
  freeOnly: boolean;
  sort: EventSort;
};

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// URL values are French, like the rest of the public URLs.
const PERIOD_PARAM: Record<string, EventPeriod> = { "30j": "month", "3mois": "quarter" };

export function parseEventParams(params: RawParams): EventsState {
  const kind = first(params.type);
  return {
    kind: (EVENT_KINDS as readonly string[]).includes(kind ?? "") ? (kind as EventKind) : null,
    sport: first(params.sport)?.match(/^[a-z0-9-]{2,40}$/)?.[0] ?? null,
    period: PERIOD_PARAM[first(params.periode) ?? ""] ?? null,
    place: parsePlace(params),
    radiusKm: parseRadius(params),
    freeOnly: first(params.gratuit) === "1",
    sort: first(params.tri) === "distance" ? "distance" : "date",
  };
}

export function buildEventsUrl(state: Partial<EventsState>, base = "/evenements"): string {
  const params = new URLSearchParams();
  if (state.kind) params.set("type", state.kind);
  if (state.sport) params.set("sport", state.sport);
  if (state.period) params.set("periode", state.period === "month" ? "30j" : "3mois");
  writePlace(params, state.place, state.radiusKm);
  if (state.freeOnly) params.set("gratuit", "1");
  if (state.sort === "distance") params.set("tri", "distance");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** True when at least one filter narrows the list (the place alone does not count). */
export function hasEventFilters(state: EventsState): boolean {
  return Boolean(state.kind || state.sport || state.period || state.radiusKm || state.freeOnly);
}

// ---------------------------------------------------------------- dates

type Dated = { startsOn: string; endsOn: string | null };

// A date key is a calendar day, not an instant: it is formatted at noon UTC so that no
// time zone can move it to the day before or after.
const atNoon = (key: string) => new Date(`${key}T12:00:00Z`);
const part = (key: string, locale: Locale, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", ...options }).format(atNoon(key));

/** The pieces of the bold date block: "30", "nov", "sam". */
export function dateTile(key: string, locale: Locale): { day: string; month: string; weekday: string } {
  const clean = (value: string) => value.replace(".", "");
  return {
    day: String(Number(key.slice(8, 10))),
    month: clean(part(key, locale, { month: "short" })),
    weekday: clean(part(key, locale, { weekday: "short" })),
  };
}

export const isMultiDay = (event: Dated) => Boolean(event.endsOn && event.endsOn !== event.startsOn);

/** "samedi 30 novembre", or "du sam. 30 nov. au dim. 1 déc." for an event over several days. */
export function eventDateLabel(event: Dated, locale: Locale, range: (from: string, to: string) => string): string {
  if (!isMultiDay(event)) return formatDateKey(event.startsOn, locale, "long");
  return range(formatDateKey(event.startsOn, locale, "short"), formatDateKey(event.endsOn as string, locale, "short"));
}

/** "30 novembre 2026" (with the year), for the detail page. */
export function fullDate(key: string, locale: Locale): string {
  return part(key, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export type Countdown = { state: "past" | "ongoing" | "today" | "tomorrow" | "upcoming"; days: number };

/** Where an event stands relative to `today` (both are Paris date keys). */
export function eventCountdown(event: Dated, today: string): Countdown {
  const days = daysUntil(event.startsOn, today);
  if ((event.endsOn ?? event.startsOn) < today) return { state: "past", days };
  if (days < 0) return { state: "ongoing", days };
  if (days === 0) return { state: "today", days };
  if (days === 1) return { state: "tomorrow", days };
  return { state: "upcoming", days };
}

type CountdownLabels = { today: string; tomorrow: string; ongoing: string; inDays: (n: number) => string };

/** "Aujourd'hui", "Demain", "J-12", "En cours". Null once the event is over. */
export function countdownLabel(countdown: Countdown, labels: CountdownLabels): string | null {
  if (countdown.state === "past") return null;
  if (countdown.state === "ongoing") return labels.ongoing;
  if (countdown.state === "today") return labels.today;
  if (countdown.state === "tomorrow") return labels.tomorrow;
  return labels.inDays(countdown.days);
}
