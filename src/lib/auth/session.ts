import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/lib/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  city: string | null;
  isDemo: boolean;
};

/**
 * The signed-in user with their role, or null.
 * The JWT is verified (not just read from the cookie) and the role always comes from the
 * database, never from anything the browser sends. Cached for the duration of one request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, full_name, city, is_demo, is_suspended")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || profile.is_suspended) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    fullName: profile.full_name,
    city: profile.city,
    isDemo: profile.is_demo,
  };
});

export function homeFor(role: UserRole): string {
  if (role === "coach") return "/pro";
  if (role === "admin") return "/admin";
  return "/";
}

/** Only same-site relative paths are accepted as a post-login destination. */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  return raw;
}

export async function requireUser(next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireCoach(next = "/pro"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (user.role !== "coach") redirect(user.role === "admin" ? "/admin" : "/devenir-coach");
  return user;
}

/** Admin pages answer 404 to everyone else: the back office does not advertise itself. */
export async function requireAdmin(next = "/admin"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (user.role !== "admin") notFound();
  return user;
}
