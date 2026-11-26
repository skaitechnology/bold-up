import type { Locale } from "./config";
import { account } from "./dict/account";
import { admin } from "./dict/admin";
import { calendar } from "./dict/calendar";
import { common } from "./dict/common";
import { events } from "./dict/events";
import { explore } from "./dict/explore";
import { places } from "./dict/places";
import { pro } from "./dict/pro";
import { site } from "./dict/site";

const dictionaries = {
  fr: { common: common.fr, site: site.fr, account: account.fr, pro: pro.fr, admin: admin.fr, explore: explore.fr, places: places.fr, events: events.fr, calendar: calendar.fr },
  en: { common: common.en, site: site.en, account: account.en, pro: pro.en, admin: admin.en, explore: explore.en, places: places.en, events: events.en, calendar: calendar.en },
} as const;

export type Dictionary = (typeof dictionaries)["fr"];

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Localized name of a database row that carries name_fr / name_en. */
export function localizedName(row: { name_fr: string; name_en: string }, locale: Locale): string {
  return locale === "fr" ? row.name_fr : row.name_en;
}
