/**
 * Real check of the live site, in a real browser, without touching the demo accounts.
 *
 *   npx vercel env pull .env.production.local --environment=production
 *   npx tsx scripts/verify-production.ts https://bold-up.vercel.app
 *
 * It creates one throwaway coach and one throwaway customer, plays the core story
 * (sign-up, documents, admin approval, discovery, booking, acceptance), asserts the
 * result in the production database, then deletes everything it created.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { demoPdf } from "./lib/demo-pdf";

const root = path.resolve(__dirname, "..");
loadEnv({ path: path.join(root, process.env.ENV_FILE ?? ".env.production.local"), quiet: true });

const BASE = (process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!BASE || !url) {
  console.error("Usage: npx tsx scripts/verify-production.ts <site url>  (needs .env.production.local)");
  process.exit(1);
}
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
const adminPassword = (JSON.parse(readFileSync(path.join(root, ".demo-credentials.json"), "utf8")) as Record<string, Record<string, string>>)[new URL(url).host]?.admin ?? "";

const run = Date.now().toString(36);
const coach = { name: `Verif Coach ${run}`, email: `verif-coach-${run}@boldup.test`, password: `Verif-${run}-2026!`, id: "", slug: "" };
const customer = { name: `Verif Client ${run}`, email: `verif-client-${run}@boldup.test`, password: `Verif-${run}-2026!` };

let passed = 0;
function ok(condition: unknown, label: string) {
  if (!condition) throw new Error(`FAILED: ${label}`);
  passed++;
  console.log(`  ✓ ${label}`);
}
async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/connexion`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/connexion"), { timeout: 30_000 });
}
async function cleanup() {
  const { data } = await db.from("profiles").select("id").in("email", [coach.email, customer.email]);
  for (const profile of data ?? []) {
    for (const bucket of ["coach-documents", "coach-media"]) {
      const { data: files } = await db.storage.from(bucket).list(profile.id, { limit: 100 });
      if (files?.length) await db.storage.from(bucket).remove(files.map((file) => `${profile.id}/${file.name}`));
    }
    await db.from("audit_logs").delete().eq("entity_id", profile.id);
    await db.from("audit_logs").delete().eq("meta->>coach_id", profile.id);
    await db.from("notifications").delete().eq("data->>coach_id", profile.id);
    await db.auth.admin.deleteUser(profile.id);
  }
}

async function main() {
  console.log(`Verifying ${BASE} (database ${new URL(url).host})`);
  const tmp = path.join(root, "test-results", "verify");
  mkdirSync(tmp, { recursive: true });
  const pdf = path.join(tmp, "document-test.pdf");
  writeFileSync(pdf, demoPdf("Document de test", coach.name));

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" })).newPage();
  try {
    // ---- public site
    await page.goto(BASE);
    ok((await page.locator("h1").textContent())?.includes("Trouvez le coach"), "home page is served with the database connected");
    await page.goto(`${BASE}/coachs?sport=boxe`);
    await page.waitForSelector('[data-testid="map"][data-ready="true"]', { timeout: 45_000 });
    ok((await page.locator('.bu-pin[data-kind="coach"]').count()) >= 2, "search shows boxing coaches as pins on the live map");
    ok((await page.locator('[data-testid="coach-card"]:visible').filter({ hasText: "Alexandre Moreau" }).count()) === 1, "the demo coach is listed");

    // ---- coach sign-up, logout, login
    await page.goto(`${BASE}/inscription`);
    await page.getByTestId("role-coach").click();
    await page.locator('input[name="fullName"]').fill(coach.name);
    await page.locator('input[name="email"]').fill(coach.email);
    await page.locator('input[name="password"]').fill(coach.password);
    await page.getByTestId("signup-submit").click();
    await page.waitForURL("**/pro", { timeout: 30_000 });
    ok(await page.getByTestId("pro-greeting").isVisible(), "coach signs up and reaches the dashboard");
    await login(page, coach.email, coach.password);
    ok(page.url().endsWith("/pro"), "coach logs out and back in: the session and role persist");
    const { data: row } = await db.from("coach_profiles").select("id, slug, verification_status").eq("display_name", coach.name).single();
    coach.id = row?.id ?? "";
    coach.slug = row?.slug ?? "";
    ok(row?.verification_status === "draft", "the new coach is a draft in the database");

    // ---- fill the profile quickly through the database (the editor itself is covered by the e2e suite)
    const photo = readFileSync(path.join(root, "scripts/data/media/yoga.jpg"));
    await db.storage.from("coach-media").upload(`${coach.id}/portrait-verif.jpg`, photo, { contentType: "image/jpeg" });
    const { data: sport } = await db.from("sports").select("id").eq("slug", "boxe").single();
    await db.from("coach_profiles").update({ headline: "Profil de vérification", bio: "Compte temporaire créé pour vérifier la mise en production, supprimé juste après.", photo_path: `${coach.id}/portrait-verif.jpg`, city: "Créteil", postal_code: "94000", lat: 48.7861, lng: 2.4551, at_gym: true, min_notice_hours: 0 }).eq("id", coach.id);
    await db.from("coach_sports").insert({ coach_id: coach.id, sport_id: sport?.id });
    await db.from("coach_services").insert({ coach_id: coach.id, name: "Séance de vérification", duration_min: 60, price_cents: 4000 });
    await db.from("coach_qualifications").insert({ coach_id: coach.id, kind: "other", title: "Qualification de test" });
    await db.from("availability_rules").insert([1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ coach_id: coach.id, weekday, start_time: "08:00", end_time: "20:00" })));

    // ---- documents: browser -> private storage -> pre-check -> review queue
    await page.goto(`${BASE}/pro/documents`);
    for (const type of ["carte_pro", "insurance"]) {
      await page.getByTestId(`upload-${type}`).click();
      await page.getByTestId("document-file").setInputFiles(pdf);
      await page.getByTestId("document-submit").click();
      await page.waitForSelector('[data-testid="document-progress"][data-stage="done"]', { timeout: 45_000 });
      await page.getByTestId("document-close").click();
    }
    const { data: documents } = await db.from("coach_documents").select("id, status, storage_path").eq("coach_id", coach.id);
    ok(documents?.length === 2 && documents.every((d) => d.status === "awaiting_review"), "documents are uploaded, pre-checked and waiting for a human");
    const publicFile = await page.request.get(`${url}/storage/v1/object/public/coach-documents/${documents![0]!.storage_path}`);
    ok(!publicFile.ok(), "documents have no public URL");
    await page.getByTestId("submit-profile").click();
    await page.waitForFunction(() => document.querySelector('[data-testid="submit-card"]')?.textContent?.includes("validation est en cours"), undefined, { timeout: 30_000 });
    ok((await db.from("coach_profiles").select("verification_status").eq("id", coach.id).single()).data?.verification_status === "awaiting_review", "the profile is submitted for review");

    // ---- admin approval
    await login(page, "admin@boldup.test", adminPassword);
    ok(page.url().endsWith("/admin"), "admin logs in");
    await page.goto(`${BASE}/admin/coachs/${coach.id}`);
    const opened = await page.request.get(`${BASE}/api/documents/${documents![0]!.id}`, { maxRedirects: 0 });
    ok(opened.status() === 307 && String(opened.headers().location).includes("token="), "admin opens a document through a signed, expiring link");
    const pending = page.locator('[data-testid="admin-document"][data-status="awaiting_review"]');
    await pending.first().getByTestId("document-approve").click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="admin-document"][data-status="awaiting_review"]').length === 1, undefined, { timeout: 30_000 });
    await pending.first().getByTestId("document-approve").click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="admin-document"][data-status="awaiting_review"]').length === 0, undefined, { timeout: 30_000 });
    await page.getByTestId("coach-approve").click();
    await page.waitForFunction(() => document.querySelector('[data-testid="coach-status"]')?.textContent === "Vérifié", undefined, { timeout: 30_000 });
    const approved = (await db.from("coach_profiles").select("verification_status, is_published").eq("id", coach.id).single()).data;
    ok(approved?.verification_status === "approved" && approved.is_published, "admin approves the coach: status and publication updated in the database");

    // ---- customer: discovery and booking
    await page.context().clearCookies();
    const profile = await page.goto(`${BASE}/coach/${coach.slug}`);
    const badge = await page
      .getByText("Profil vérifié par Bold Up")
      .waitFor({ timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (!badge) console.log(`    (profile answered ${profile?.status()} at ${page.url()})`);
    ok(badge, "the approved coach has a public, verified profile");
    const panel = page.getByTestId("booking-panel").first();
    await panel.getByTestId("day-available").first().click();
    await panel.getByTestId("slot").first().click();
    await panel.getByTestId("booking-submit").click();
    await page.waitForURL(/\/connexion\?next=/, { timeout: 30_000 });
    await page.getByRole("link", { name: "Créer un compte" }).click();
    await page.getByTestId("role-customer").click();
    await page.locator('input[name="fullName"]').fill(customer.name);
    await page.locator('input[name="email"]').fill(customer.email);
    await page.locator('input[name="password"]').fill(customer.password);
    await page.getByTestId("signup-submit").click();
    await page.waitForURL(`**/coach/${coach.slug}?reserver=1`, { timeout: 30_000 });
    const back = page.getByTestId("booking-panel").first();
    await back.getByTestId("day-available").first().waitFor({ timeout: 30_000 });
    if (await back.getByTestId("booking-submit").isDisabled()) {
      await back.getByTestId("day-available").first().click();
      await back.getByTestId("slot").first().click();
    }
    await back.getByTestId("booking-submit").click();
    await page.waitForSelector('[data-testid="booking-sent"]', { timeout: 30_000 });
    const booking = (await db.from("bookings").select("id, status").eq("coach_id", coach.id).single()).data;
    ok(booking?.status === "requested", "customer signs up and the booking request is stored");
    ok((await page.goto(`${BASE}/admin`))?.status() === 404, "a customer gets 404 on the admin area");

    // ---- coach accepts
    await login(page, coach.email, coach.password);
    await page.goto(`${BASE}/pro/demandes`);
    await page.getByTestId("booking-accept").first().click();
    await page.waitForFunction(() => document.body.textContent?.includes("Séance confirmée."), undefined, { timeout: 30_000 });
    ok((await db.from("bookings").select("status").eq("id", booking!.id).single()).data?.status === "accepted", "coach accepts: the booking is confirmed in the database");
  } finally {
    await browser.close();
    await cleanup();
    console.log("  (temporary accounts removed)");
  }
  console.log(`\n${passed} checks passed on ${BASE}`);
}

main().catch((error) => {
  console.error(String(error).slice(0, 600));
  process.exit(1);
});
