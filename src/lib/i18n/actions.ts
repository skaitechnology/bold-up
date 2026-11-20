"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "./config";

/** Switches the interface language. Remembered in a cookie, and on the profile when signed in. */
export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (userId) await supabase.from("profiles").update({ locale }).eq("id", userId);
  } catch {
    // The cookie is enough: saving the preference on the profile is best effort.
  }
  revalidatePath("/", "layout");
}
