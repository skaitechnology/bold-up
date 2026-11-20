// Central place for environment access. Public values are inlined at build time by Next.js,
// so they must be read with the literal `process.env.NAME` form.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Supabase projects expose either the legacy "anon" key or the newer "publishable" key.
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";

export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";

/** Public origin of the app, without a trailing slash. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
