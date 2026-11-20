import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getDictionary } from "./index";

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Server-side access to the current locale and its dictionary. */
export const getI18n = cache(async () => {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
});
