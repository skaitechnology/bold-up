import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import type { Database } from "../../src/lib/database.types";

export const root = path.resolve(__dirname, "../..");
loadEnv({ path: path.join(root, ".env.local"), quiet: true });

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function assertLocalSupabase() {
  if (!/127\.0\.0\.1|localhost/.test(SUPABASE_URL)) {
    throw new Error(`End-to-end tests only run against local Supabase. Current URL: ${SUPABASE_URL || "(empty)"}`);
  }
}

/** Service-role client: used by tests to assert real database state and to clean up. */
export function serviceClient(): SupabaseClient<Database> {
  assertLocalSupabase();
  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** A client signed in as a normal user, to probe the API exactly as an attacker could. */
export async function userClient(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`userClient(${email}): ${error.message}`);
  return client;
}

export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function demoPassword(role: "coach" | "customer" | "admin" | "pending"): string {
  const store = JSON.parse(readFileSync(path.join(root, ".demo-credentials.json"), "utf8")) as Record<string, Record<string, string>>;
  const password = store[new URL(SUPABASE_URL).host]?.[role];
  if (!password) throw new Error("Demo credentials not found. Run `npm run db:seed` first.");
  return password;
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/connexion");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"));
}

export async function signOut(page: Page) {
  await page.context().clearCookies();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
}

/** Removes every account created by a test run (cascades to profiles, bookings, messages…). */
export async function deleteUsersByEmail(emails: string[]) {
  const db = serviceClient();
  const { data } = await db.from("profiles").select("id, email").in("email", emails);
  for (const profile of data ?? []) {
    for (const bucket of ["coach-documents", "coach-media"]) {
      const { data: files } = await db.storage.from(bucket).list(profile.id, { limit: 100 });
      if (files?.length) await db.storage.from(bucket).remove(files.map((file) => `${profile.id}/${file.name}`));
    }
    await db.auth.admin.deleteUser(profile.id);
  }
}
