import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client. Bypasses row level security, so it is only used for the few
 * operations that genuinely need it (account creation, the document pre-check,
 * rate limiting) and always after the caller has been authorized in code.
 * The `server-only` import makes the build fail if this file reaches the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !key) {
    throw new Error("Supabase service credentials are missing (SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createSupabaseClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
