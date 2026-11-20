import { intlLocale, type Locale } from "@/lib/i18n/config";

/** All scheduling is expressed in French local time, whatever the visitor's device says. */
export const TIME_ZONE = "Europe/Paris";

export function formatPrice(cents: number, locale: Locale): string {
  const euros = cents / 100;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

type DateInput = string | number | Date;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

function fmt(value: DateInput, locale: Locale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TIME_ZONE, ...options }).format(toDate(value));
}

/** 18:30 */
export function formatTime(value: DateInput, locale: Locale): string {
  return fmt(value, locale, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** lundi 24 novembre */
export function formatDayLong(value: DateInput, locale: Locale): string {
  return fmt(value, locale, { weekday: "long", day: "numeric", month: "long" });
}

/** lun. 24 nov. */
export function formatDayShort(value: DateInput, locale: Locale): string {
  return fmt(value, locale, { weekday: "short", day: "numeric", month: "short" });
}

/** 24 novembre 2026 */
export function formatDate(value: DateInput, locale: Locale): string {
  return fmt(value, locale, { day: "numeric", month: "long", year: "numeric" });
}

/** 24/11/2026 14:05 */
export function formatDateTimeCompact(value: DateInput, locale: Locale): string {
  return fmt(value, locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** YYYY-MM-DD of an instant, as seen from Paris. */
export function parisDateKey(value: DateInput): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    toDate(value),
  );
}

/** Adds whole days to a YYYY-MM-DD key (calendar arithmetic, no time zone involved). */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** A YYYY-MM-DD key rendered as a day label. Noon UTC keeps it on the same Paris day. */
export function formatDateKey(key: string, locale: Locale, style: "long" | "short" = "long"): string {
  const at = `${key}T12:00:00Z`;
  return style === "long" ? formatDayLong(at, locale) : formatDayShort(at, locale);
}

export function formatDistance(km: number, locale: Locale): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "·";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
