// Human labels for calendar days and periods. Keys are plain calendar days, so they are
// formatted in UTC at noon: the label never shifts with the reader's time zone.

import { periodRange, sameMonth, type CalendarView, type DateKey } from "@/lib/calendar";
import { intlLocale, type Locale } from "@/lib/i18n/config";

const fmt = (key: DateKey, locale: Locale, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", ...options }).format(new Date(`${key}T12:00:00Z`));

/** lun */
export const weekdayShort = (key: DateKey, locale: Locale) => fmt(key, locale, { weekday: "short" }).replace(".", "");
/** L */
export const weekdayNarrow = (key: DateKey, locale: Locale) => fmt(key, locale, { weekday: "narrow" });
/** 24 */
export const dayNumber = (key: DateKey) => Number(key.slice(8));
/** lundi 24 novembre */
export const dayLabel = (key: DateKey, locale: Locale) => fmt(key, locale, { weekday: "long", day: "numeric", month: "long" });
/** lun. 24 nov. */
export const dayLabelShort = (key: DateKey, locale: Locale) => fmt(key, locale, { weekday: "short", day: "numeric", month: "short" });
/** novembre 2026 */
export const monthLabel = (key: DateKey, locale: Locale) => fmt(key, locale, { month: "long", year: "numeric" });

/** 24 – 30 nov. · 30 nov. – 6 déc. */
export function weekLabel(key: DateKey, locale: Locale, join: (from: string, to: string) => string): string {
  const { from, to } = periodRange("week", key);
  const left = fmt(from, locale, sameMonth(from, to) ? { day: "numeric" } : { day: "numeric", month: "short" });
  return join(left, fmt(to, locale, { day: "numeric", month: "short" }));
}

export function periodLabel(view: CalendarView, key: DateKey, locale: Locale, join: (from: string, to: string) => string): string {
  if (view === "day") return dayLabel(key, locale);
  if (view === "week") return weekLabel(key, locale, join);
  return monthLabel(key, locale);
}
