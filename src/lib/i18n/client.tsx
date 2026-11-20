"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { getDictionary } from "./index";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Client-side access to the current locale and its dictionary. */
export function useI18n() {
  const locale = useContext(LocaleContext);
  return useMemo(() => ({ locale, t: getDictionary(locale) }), [locale]);
}
