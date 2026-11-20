"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser client (anon key + the user's session). Used for uploads and realtime. */
export function createClient() {
  browserClient ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return browserClient;
}
