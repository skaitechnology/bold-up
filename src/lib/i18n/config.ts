export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** French first: it is the product's primary audience. */
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "bu_locale";

export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en";
}

/** BCP 47 tag used with Intl formatters. English uses British conventions (24h, day first). */
export function intlLocale(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-GB";
}
