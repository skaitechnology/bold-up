import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Best-effort client address behind Vercel's proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Database-backed fixed-window limiter (works across serverless instances).
 * Returns true when the call is allowed. Fails open if the limiter itself is unreachable,
 * so an infrastructure hiccup never locks everyone out.
 */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}
