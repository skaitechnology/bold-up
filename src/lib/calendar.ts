// Calendar arithmetic for the day / week / month views (slot picker and bookings calendar).
// Pure functions on local date keys (YYYY-MM-DD): no I/O, no dependence on the device's
// time zone. Instants are turned into keys with `parisDateKey`, so a day always means a
// day in Paris.

import { TIME_ZONE, addDaysToKey, parisDateKey } from "@/lib/format";

/** A local calendar day, YYYY-MM-DD. Keys compare correctly as plain strings. */
export type DateKey = string;

export const CALENDAR_VIEWS = ["day", "week", "month"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

/** Opening view everywhere a calendar is shown. */
export const DEFAULT_CALENDAR_VIEW: CalendarView = "week";

/** How far ahead a session can be requested. Mirrors HORIZON_DAYS in lib/actions/bookings.ts. */
export const BOOKING_HORIZON_DAYS = 28;

// The public URLs are French, like the rest of the site (?cal=semaine&date=2026-11-30).
const VIEW_PARAM: Record<string, CalendarView> = { jour: "day", semaine: "week", mois: "month" };

export function parseCalendarView(value: string | null | undefined): CalendarView {
  return VIEW_PARAM[value ?? ""] ?? DEFAULT_CALENDAR_VIEW;
}

export function calendarViewParam(view: CalendarView): string {
  return Object.keys(VIEW_PARAM).find((key) => VIEW_PARAM[key] === view) as string;
}

const parts = (key: DateKey) => key.split("-").map(Number) as [number, number, number];
const toKey = (year: number, monthIndex: number, day: number) => new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);

/** Anchor of a booking's card, so a calendar can point to it (`#reservation-<id>`). */
export const bookingAnchor = (id: string) => `reservation-${id}`;

/** A well-formed key for a day that exists (2026-02-30 is refused), or null. */
export function parseDateKey(value: string | null | undefined): DateKey | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = parts(value);
  return toKey(y, m - 1, d) === value ? value : null;
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function weekdayOf(key: DateKey): number {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Monday of the week containing `key` (weeks run Monday to Sunday). */
export function startOfWeek(key: DateKey): DateKey {
  return addDaysToKey(key, 1 - weekdayOf(key));
}

/** The seven days, Monday first, of the week containing `key`. */
export function weekDays(key: DateKey): DateKey[] {
  const monday = startOfWeek(key);
  return Array.from({ length: 7 }, (_, index) => addDaysToKey(monday, index));
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 8)}01`;
}

export function endOfMonth(key: DateKey): DateKey {
  const [y, m] = parts(key);
  return toKey(y, m, 0);
}

/** Same day of the month `count` months away, pulled back to the last day when it does not exist. */
export function addMonths(key: DateKey, count: number): DateKey {
  const [y, m, d] = parts(key);
  const first = toKey(y, m - 1 + count, 1);
  const last = Number(endOfMonth(first).slice(8));
  return `${first.slice(0, 8)}${String(Math.min(d, last)).padStart(2, "0")}`;
}

export const sameMonth = (a: DateKey, b: DateKey) => a.slice(0, 7) === b.slice(0, 7);

/**
 * The month containing `key` as rows of seven days, Monday first. The first and last rows
 * are completed with the neighbouring months' days, so every row is a full week.
 */
export function monthGrid(key: DateKey): DateKey[][] {
  const first = startOfWeek(startOfMonth(key));
  const last = endOfMonth(key);
  const weeks: DateKey[][] = [];
  for (let monday = first; monday <= last; monday = addDaysToKey(monday, 7)) weeks.push(weekDays(monday));
  return weeks;
}

export function clampKey(key: DateKey, min: DateKey, max: DateKey): DateKey {
  return key < min ? min : key > max ? max : key;
}

/** First and last day shown by a view centred on `key`. */
export function periodRange(view: CalendarView, key: DateKey): { from: DateKey; to: DateKey } {
  if (view === "day") return { from: key, to: key };
  if (view === "week") return { from: startOfWeek(key), to: addDaysToKey(startOfWeek(key), 6) };
  return { from: startOfMonth(key), to: endOfMonth(key) };
}

/** Moves the cursor by one period: a day, a week or a month. */
export function shiftPeriod(view: CalendarView, key: DateKey, direction: -1 | 1): DateKey {
  if (view === "day") return addDaysToKey(key, direction);
  if (view === "week") return addDaysToKey(key, 7 * direction);
  return addMonths(key, direction);
}

/** Whether the neighbouring period still overlaps the allowed range (both bounds optional). */
export function canShiftPeriod(view: CalendarView, key: DateKey, direction: -1 | 1, min?: DateKey | null, max?: DateKey | null): boolean {
  const { from, to } = periodRange(view, shiftPeriod(view, key, direction));
  if (min && to < min) return false;
  if (max && from > max) return false;
  return true;
}

/**
 * Next cursor after a period change, kept inside the allowed range: stepping back to the
 * current week lands on today rather than on a day that is already over.
 */
export function shiftWithin(view: CalendarView, key: DateKey, direction: -1 | 1, min: DateKey, max: DateKey): DateKey {
  if (!canShiftPeriod(view, key, direction, min, max)) return key;
  return clampKey(shiftPeriod(view, key, direction), min, max);
}

/** Last bookable day, counting from `today`. */
export function bookingHorizon(today: DateKey, days: number = BOOKING_HORIZON_DAYS): DateKey {
  return addDaysToKey(today, days);
}

/** Groups instants (ISO strings) by the Paris day they fall on, each day sorted by time. */
export function groupByParisDay<T>(items: readonly T[], instantOf: (item: T) => string): Map<DateKey, T[]> {
  const days = new Map<DateKey, T[]>();
  for (const item of items) {
    const key = parisDateKey(instantOf(item));
    const list = days.get(key);
    if (list) list.push(item);
    else days.set(key, [item]);
  }
  for (const list of days.values()) list.sort((a, b) => instantOf(a).localeCompare(instantOf(b)));
  return days;
}

/** The first of `days` on or after `from` (or the first of all when none is later), null if empty. */
export function nextDayWith(days: Iterable<DateKey>, from: DateKey): DateKey | null {
  const sorted = [...days].sort();
  return sorted.find((key) => key >= from) ?? sorted[0] ?? null;
}

export type DayPart = "morning" | "afternoon" | "evening";

/** Hour of the day (0-23) shown by the clocks in Paris at that instant. */
export function parisHour(value: string | number | Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).format(new Date(value));
  return Number(hour) % 24;
}

/** Morning until noon, afternoon until 18:00, evening after. */
export function dayPartOf(value: string | number | Date): DayPart {
  const hour = parisHour(value);
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}
