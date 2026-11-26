import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { demoPdf } from "../../scripts/lib/demo-pdf";
import { SUPABASE_URL, anonClient, deleteUsersByEmail, demoPassword, root, serviceClient, signIn, signOut, userClient } from "./helpers";

/**
 * The core story of BOLD UP, played end to end against the real database:
 * a coach signs up, completes their profile, uploads documents, an admin approves them,
 * a customer discovers the coach and requests a session, the coach accepts, they chat.
 * Every step asserts persisted state, not just what the screen says.
 */
test.describe.configure({ mode: "serial" });

const run = Date.now().toString(36);
const coach = { name: "Léa Fontaine", email: `e2e-coach-${run}@boldup.test`, password: "E2e-coach-2026!", slug: "lea-fontaine", headline: `Coach boxe test ${run}` };
const customer = { name: "Nina Perrot", email: `e2e-client-${run}@boldup.test`, password: "E2e-client-2026!" };
const tmp = path.join(root, "test-results", "fixtures");
const pdfPath = path.join(tmp, "carte-professionnelle.pdf");
const photoPath = path.join(root, "scripts/data/media/yoga.jpg");

const state: { coachId: string; slug: string; documentPath: string; documentId: string; bookingStartsAt: string; serviceId: string } = {
  coachId: "",
  slug: "",
  documentPath: "",
  documentId: "",
  bookingStartsAt: "",
  serviceId: "",
};

test.beforeAll(() => {
  mkdirSync(tmp, { recursive: true });
  writeFileSync(pdfPath, demoPdf("Carte professionnelle", coach.name));
});

test.afterAll(async () => {
  await deleteUsersByEmail([coach.email, customer.email]);
});

const toast = (page: Page, text: string | RegExp) => expect(page.getByText(text).first()).toBeVisible();

test("journey 1 — a coach signs up in three actions and the account persists", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByTestId("role-coach").click(); // action 1
  await page.locator('input[name="fullName"]').fill(coach.name); // action 2: three fields
  await page.locator('input[name="email"]').fill(coach.email);
  await page.locator('input[name="password"]').fill(coach.password);
  await page.getByTestId("signup-submit").click(); // action 3

  await page.waitForURL("**/pro");
  await expect(page.getByTestId("pro-greeting")).toHaveText("Bienvenue sur Bold Up, Léa.");
  await expect(page.getByTestId("status-card")).toHaveAttribute("data-status", "draft");
  await expect(page.getByTestId("completion-percent")).toContainText("0");

  // the role was assigned by the database, not by the browser
  const db = serviceClient();
  const { data: profile } = await db.from("profiles").select("id, role").eq("email", coach.email).single();
  expect(profile?.role).toBe("coach");
  state.coachId = profile!.id;
  const { data: row } = await db.from("coach_profiles").select("slug, verification_status, is_published").eq("id", state.coachId).single();
  expect(row).toMatchObject({ verification_status: "draft", is_published: false });

  // log out, log back in: same account, same role, same place
  await signOut(page);
  await page.goto("/pro");
  await expect(page).toHaveURL(/\/connexion/);
  await signIn(page, coach.email, coach.password);
  await expect(page).toHaveURL(/\/pro$/);
});

test("journey 2 — the coach completes the profile step by step and it persists", async ({ page }) => {
  await signIn(page, coach.email, coach.password);
  await page.goto("/pro/profil");

  // identity
  const identity = page.getByTestId("identity-form");
  await identity.locator('input[name="headline"]').fill(coach.headline);
  await identity.locator('textarea[name="bio"]').fill("Séances de boxe individuelles pour débutants et confirmés, avec un vrai suivi technique et physique.");
  await page.getByTestId("identity-save").click();
  await toast(page, "Modifications enregistrées");

  // photo: uploaded from the browser to the coach's own storage folder
  await page.getByTestId("photo-input").setInputFiles(photoPath);
  await expect(page.getByTestId("photo-preview")).toHaveAttribute("data-has-photo", "true", { timeout: 20_000 });

  // coaching
  const coaching = page.getByTestId("coaching-form");
  await coaching.locator('[data-sport="boxe"]').click();
  await coaching.getByText("Débutant", { exact: true }).click();
  await coaching.getByText("Séance individuelle", { exact: true }).click();
  await page.getByTestId("coaching-save").click();
  await expect(coaching.locator('input[name="sports"]:checked')).toHaveCount(1);

  // a service with its price
  await page.getByTestId("service-add").first().click();
  await page.locator('input[name="name"]').fill("Boxe individuelle");
  await page.locator('input[name="price"]').fill("50");
  await page.getByTestId("service-save").click();
  await expect(page.getByTestId("service-row")).toHaveCount(1);
  await expect(page.getByTestId("service-price")).toHaveText("50 €");

  // location: a town, never an address
  await page.locator("#coach-city").fill("Créteil");
  await page.getByRole("option", { name: /Créteil/ }).first().click();
  const location = page.getByTestId("location-form");
  await location.getByText("En salle", { exact: true }).click();
  await page.getByTestId("location-save").click();
  await expect.poll(async () => (await serviceClient().from("coach_profiles").select("city").eq("id", state.coachId).single()).data?.city).toBe("Créteil");

  // a stated qualification
  await page.getByTestId("qualification-form").locator('input[name="title"]').fill("BPJEPS Boxe");
  await page.getByTestId("qualification-add").click();
  await expect(page.getByTestId("qualification-row")).toHaveCount(1);
  await expect(page.getByTestId("qualification-row")).toContainText("Déclarée");

  // weekly availability
  await page.goto("/pro/agenda?vue=disponibilites");
  const addRange = page.getByTestId("add-range");
  for (let day = 0; day < 7; day++) await addRange.nth(day).click();
  await page.getByTestId("availability-save").click();
  await toast(page, "Horaires enregistrés.");

  // refresh: everything is still there, and progress is computed from real data (8 of 9 steps)
  await page.goto("/pro/profil");
  await expect(page.getByTestId("identity-form").locator('input[name="headline"]')).toHaveValue(coach.headline);
  await page.goto("/pro");
  await expect(page.getByTestId("completion-percent")).toContainText("89");
  await expect(page.locator('[data-testid="checklist"] [data-step="documents"]')).toHaveAttribute("data-done", "false");

  const db = serviceClient();
  const { data: row } = await db.from("coach_profiles").select("slug, headline, photo_path, lat, lng").eq("id", state.coachId).single();
  expect(row?.headline).toBe(coach.headline);
  expect(row?.photo_path).toContain(state.coachId);
  expect(row?.lat).toBeGreaterThan(48.7);
  state.slug = row!.slug;
  const { count } = await db.from("availability_rules").select("id", { count: "exact", head: true }).eq("coach_id", state.coachId);
  expect(count).toBe(7);

  // not public yet: a draft never appears in the marketplace
  const { data: visible } = await anonClient().from("coach_profiles").select("id").eq("id", state.coachId);
  expect(visible).toEqual([]);
});

test("journey 3 — documents are stored privately, pre-checked, and reach the review queue", async ({ page, request }) => {
  await signIn(page, coach.email, coach.password);
  await page.goto("/pro/documents");

  for (const type of ["carte_pro", "insurance"]) {
    await page.getByTestId(`upload-${type}`).click();
    await page.getByTestId("document-file").setInputFiles(pdfPath);
    await page.getByTestId("document-submit").click();
    // the three visible states: received -> pre-check in progress -> done, awaiting validation
    await expect(page.getByTestId("document-progress")).toHaveAttribute("data-stage", "done", { timeout: 30_000 });
    await expect(page.getByTestId("document-progress")).toContainText("Pré-vérification terminée — en attente de validation");
    await expect(page.getByTestId("document-progress")).toContainText("Pré-vérification IA simulée");
    await page.getByTestId("document-close").click();
    await expect(page.locator(`[data-testid="doc-type-${type}"] [data-testid="document-row"]`)).toHaveAttribute("data-status", "awaiting_review");
  }

  const db = serviceClient();
  const { data: documents } = await db.from("coach_documents").select("id, type_code, status, storage_path, precheck").eq("coach_id", state.coachId);
  expect(documents).toHaveLength(2);
  for (const document of documents!) {
    expect(document.status).toBe("awaiting_review");
    expect(document.precheck).toMatchObject({ simulated: true, passed: true });
  }
  state.documentId = documents![0]!.id;
  state.documentPath = documents![0]!.storage_path;

  // the full state machine was recorded: uploaded -> precheck_pending -> precheck_completed -> awaiting_review
  const { data: events } = await db.from("verification_events").select("to_status").eq("document_id", state.documentId).order("id");
  expect(events?.map((event) => event.to_status)).toEqual(["uploaded", "precheck_pending", "precheck_completed", "awaiting_review"]);

  // private storage: no public URL, and the app route refuses anonymous visitors
  const publicUrl = await request.get(`${SUPABASE_URL}/storage/v1/object/public/coach-documents/${state.documentPath}`);
  expect(publicUrl.ok()).toBe(false);
  const anonymous = await request.get(`/api/documents/${state.documentId}`, { maxRedirects: 0, headers: { cookie: "" } });
  expect(anonymous.status()).toBe(401);

  // the owner gets a short-lived signed link
  const own = await page.request.get(`/api/documents/${state.documentId}`, { maxRedirects: 0 });
  expect(own.status()).toBe(307);
  expect(own.headers().location).toContain("token=");

  // submit for human review
  await page.getByTestId("submit-profile").click();
  await toast(page, "Profil soumis");
  await page.goto("/pro");
  await expect(page.getByTestId("status-card")).toHaveAttribute("data-status", "awaiting_review");
  await expect(page.getByTestId("status-text")).toContainText("Notre équipe vérifie vos justificatifs");

  const { data: row } = await db.from("coach_profiles").select("verification_status, is_published").eq("id", state.coachId).single();
  expect(row).toMatchObject({ verification_status: "awaiting_review", is_published: false });
});

test("journey 4 — the administrator reviews the documents and approves the coach", async ({ page }) => {
  await signIn(page, "admin@boldup.test", demoPassword("admin"));
  await expect(page).toHaveURL(/\/admin$/);

  const queued = page.getByTestId("queue-item").filter({ hasText: coach.name });
  await expect(queued).toBeVisible();
  await queued.getByTestId("queue-review").click();
  await page.waitForURL(`**/admin/coachs/${state.coachId}`);
  await expect(page.getByTestId("coach-status")).toHaveText("En cours de validation");

  // approval is impossible while documents are not approved
  await expect(page.getByTestId("coach-approve")).toBeDisabled();
  await expect(page.getByTestId("approve-blockers")).toBeVisible();

  // the admin opens the file through a signed, expiring link
  const opened = await page.request.get(`/api/documents/${state.documentId}`, { maxRedirects: 0 });
  expect(opened.status()).toBe(307);

  // review each document, recording the external check on the first one
  const pending = page.locator('[data-testid="admin-document"][data-status="awaiting_review"]');
  await expect(pending).toHaveCount(2);
  await pending.first().locator('textarea[name="externalCheck"]').fill("Carte contrôlée sur le registre public (test automatisé).");
  await pending.first().getByTestId("document-approve").click();
  await expect(pending).toHaveCount(1);
  await pending.first().getByTestId("document-approve").click();
  await expect(pending).toHaveCount(0);

  await expect(page.getByTestId("coach-approve")).toBeEnabled();
  await page.getByTestId("coach-approve").click();
  await expect(page.getByTestId("coach-status")).toHaveText("Vérifié");

  const db = serviceClient();
  const { data: row } = await db.from("coach_profiles").select("verification_status, is_published, verified_by, verified_at").eq("id", state.coachId).single();
  expect(row?.verification_status).toBe("approved");
  expect(row?.is_published).toBe(true);
  expect(row?.verified_by).toBeTruthy();
  expect(row?.verified_at).toBeTruthy();

  // who decided, and when, is in the audit log; the external check is kept as an internal note
  const { data: audit } = await db.from("audit_logs").select("action, actor_id").eq("entity_id", state.coachId);
  expect(audit?.some((entry) => entry.action === "coach.approve" && entry.actor_id === row?.verified_by)).toBe(true);
  const { data: internal } = await db.from("verification_events").select("note").eq("coach_id", state.coachId).eq("is_internal", true);
  expect(internal?.[0]?.note).toContain("registre public");
});

test("journey 4b — the coach sees the decision on their dashboard", async ({ page }) => {
  await signIn(page, coach.email, coach.password);
  await expect(page.getByTestId("status-card")).toHaveAttribute("data-status", "approved");
  await expect(page.getByTestId("status-card")).toContainText("Votre profil est publié.");
  await expect(page.getByTestId("public-url")).toContainText(`/coach/${state.slug}`);
  await page.goto("/notifications");
  await expect(page.getByTestId("notification").filter({ hasText: "Votre profil est validé et publié" })).toBeVisible();
});

test("journey 5 — a visitor finds boxing coaches near Créteil on the list and the map", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Trouver mon COACH");
  // the magnifier opens the search in place: disciplines with their icons, then the filters
  await page.getByTestId("home-search-open").click();
  await expect(page.getByTestId("home-finder")).toBeVisible();
  await page.getByTestId("home-sport-boxe").click();
  await page.getByTestId("home-search").click();
  await page.waitForURL(/\/coachs\?sport=boxe/);

  // every result is a boxing coach; the newly approved one is among them
  const cards = page.locator('[data-testid="coach-card"]:visible');
  await expect(cards.filter({ hasText: coach.name })).toHaveCount(1);
  await expect(cards.filter({ hasText: "Alexandre Moreau" })).toHaveCount(1);
  await expect(cards.filter({ hasText: "Sarah Lemoine" })).toHaveCount(0); // yoga: filtered out
  await expect(page.getByTestId("result-count")).toContainText("3 coachs");

  // a real map: one pin per coach in the results, at their coordinates
  await expect(page.getByTestId("map")).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await expect(page.locator('.bu-pin[data-kind="coach"]')).toHaveCount(3);
  // gyms are there too, on their own or grouped in a bubble when they would overlap
  expect(await page.locator('.bu-pin[data-kind="venue"], .bu-cluster').count()).toBeGreaterThan(3);

  // distance filter uses real coordinates: 2 km around Créteil keeps the two Créteil coaches
  const radius = page.locator('[data-testid="filter-radius"]:visible');
  await radius.selectOption("2");
  await expect(page.getByTestId("result-count")).toContainText("2 coachs");
  await expect(page.locator('.bu-pin[data-kind="coach"]')).toHaveCount(2);
  await radius.selectOption("");

  // selecting a pin shows a preview that leads to the right profile
  await page.locator('.bu-pin[data-kind="coach"]', { hasText: "50 €" }).first().click();
  await expect(page.getByTestId("map-preview")).toBeVisible();

  await cards.filter({ hasText: coach.name }).click();
  await page.waitForURL(`**/coach/${state.slug}`);
  await expect(page.getByTestId("coach-name")).toHaveText(coach.name);
  await expect(page.getByText("Profil vérifié par Bold Up")).toBeVisible();
});

test("journey 6 — a new customer requests a session on a free slot", async ({ page }) => {
  await page.goto(`/coach/${state.slug}`);
  const panel = page.getByTestId("booking-panel").first();
  await panel.getByTestId("day-available").first().click();
  await panel.getByTestId("slot").first().click();
  await panel.getByTestId("booking-submit").click();

  // booking needs an account: sign up, then land back on the profile with the choice kept
  await page.waitForURL(/\/connexion\?next=/);
  await page.getByRole("link", { name: "Créer un compte" }).click();
  await page.waitForURL(/\/inscription\?next=/);
  await page.getByTestId("role-customer").click();
  await page.locator('input[name="fullName"]').fill(customer.name);
  await page.locator('input[name="email"]').fill(customer.email);
  await page.locator('input[name="password"]').fill(customer.password);
  await page.getByTestId("signup-submit").click();
  await page.waitForURL(`**/coach/${state.slug}?reserver=1`);

  const back = page.getByTestId("booking-panel").first();
  const submit = back.getByTestId("booking-submit");
  if (await submit.isDisabled()) {
    await back.getByTestId("day-available").first().click();
    await back.getByTestId("slot").first().click();
  }
  await expect(back.locator('[data-testid="slot"][aria-pressed="true"]')).toHaveCount(1);
  await back.locator('textarea[name="message"]').fill("Bonjour, je débute la boxe.");
  await submit.click();
  await expect(page.getByTestId("booking-sent")).toContainText("Votre demande a été envoyée.");

  const db = serviceClient();
  const { data: profile } = await db.from("profiles").select("id, role").eq("email", customer.email).single();
  expect(profile?.role).toBe("customer");
  const { data: bookings } = await db.from("bookings").select("status, starts_at, service_id, service_name, price_cents, message").eq("customer_id", profile!.id);
  expect(bookings).toHaveLength(1);
  expect(bookings![0]).toMatchObject({ status: "requested", service_name: "Boxe individuelle", price_cents: 5000, message: "Bonjour, je débute la boxe." });
  state.bookingStartsAt = bookings![0]!.starts_at;
  state.serviceId = bookings![0]!.service_id!;

  await page.goto("/reservations");
  await expect(page.getByTestId("booking-card")).toHaveAttribute("data-status", "requested");
  await expect(page.getByTestId("booking-card")).toContainText("En attente de réponse");
});

test("journey 7 — the coach accepts; both sides see it and the slot is gone", async ({ page }) => {
  await signIn(page, coach.email, coach.password);
  await page.goto("/pro/demandes");
  const request = page.getByTestId("booking-card").filter({ hasText: customer.name });
  await expect(request).toContainText("Bonjour, je débute la boxe.");
  await request.getByTestId("booking-accept").click();
  await toast(page, "Séance confirmée.");

  const db = serviceClient();
  await expect.poll(async () => (await db.from("bookings").select("status").eq("coach_id", state.coachId).single()).data?.status).toBe("accepted");

  await page.goto("/pro/demandes?vue=confirmees");
  await expect(page.getByTestId("booking-card").filter({ hasText: customer.name })).toHaveAttribute("data-status", "accepted");
  await page.goto("/pro/agenda");
  await expect(page.getByTestId("agenda-session").filter({ hasText: customer.name }).first()).toBeVisible();

  // the customer sees the confirmation
  await signOut(page);
  await signIn(page, customer.email, customer.password);
  await page.goto("/reservations");
  await expect(page.getByTestId("booking-card")).toHaveAttribute("data-status", "accepted");
  await expect(page.getByTestId("booking-card")).toContainText("Confirmée");

  // the slot is no longer offered…
  const day = state.bookingStartsAt.slice(0, 10);
  const { data: slots } = await anonClient().rpc("open_slots", { p_coach_id: state.coachId, p_duration_min: 60, p_from: day, p_to: day });
  const taken = new Date(state.bookingStartsAt).getTime();
  expect((slots ?? []).some((slot) => new Date(slot.starts_at).getTime() === taken)).toBe(false);

  // …and the database refuses a second booking on it, whatever the client sends
  const camille = await userClient("camille@boldup.test", demoPassword("customer"));
  const second = await camille.rpc("request_booking", { p_service_id: state.serviceId, p_starts_at: state.bookingStartsAt });
  expect(second.error?.message).toContain("slot_unavailable");
});

test("journey 8 — coach and customer exchange messages that persist", async ({ page }) => {
  await signIn(page, customer.email, customer.password);
  await page.goto("/reservations");
  await page.getByRole("button", { name: "Écrire au coach" }).click();
  await page.waitForURL(/\/messages\/[0-9a-f-]{36}/);
  await expect(page.getByTestId("thread-with")).toHaveText(coach.name);
  await page.getByTestId("message-input").fill("Faut-il apporter des gants ?");
  await page.getByTestId("message-send").click();
  await expect(page.getByTestId("message-mine").filter({ hasText: "Faut-il apporter des gants ?" })).toBeVisible();

  // the coach receives it, reads it and replies
  await signOut(page);
  await signIn(page, coach.email, coach.password);
  await page.goto("/pro/messages");
  const conversation = page.getByTestId("conversation").filter({ hasText: customer.name });
  await expect(conversation).toContainText("Faut-il apporter des gants ?");
  await conversation.click();
  await expect(page.getByTestId("message-theirs").filter({ hasText: "Faut-il apporter des gants ?" })).toBeVisible();
  await page.getByTestId("message-input").fill("Non, je fournis tout le matériel.");
  await page.getByTestId("message-send").click();
  await expect(page.getByTestId("message-mine").filter({ hasText: "Non, je fournis tout le matériel." })).toBeVisible();

  // the customer sees the answer after a full reload
  await signOut(page);
  await signIn(page, customer.email, customer.password);
  await page.goto("/messages");
  await page.getByTestId("conversation").filter({ hasText: coach.name }).click();
  await expect(page.getByTestId("message-theirs").filter({ hasText: "Non, je fournis tout le matériel." })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("message-theirs").filter({ hasText: "Non, je fournis tout le matériel." })).toBeVisible();

  // real rows, no automatic replies: exactly the two messages that were typed
  const db = serviceClient();
  const { data: messages } = await db.from("messages").select("body, conversations!inner(coach_id)").eq("conversations.coach_id", state.coachId).order("id");
  expect(messages?.map((message) => message.body)).toEqual(["Faut-il apporter des gants ?", "Non, je fournis tout le matériel."]);
});

test("journey 9 — the coach edits a price and the public profile follows", async ({ page }) => {
  await signIn(page, coach.email, coach.password);
  await page.goto("/pro/profil");
  await page.getByTestId("service-edit").first().click();
  await page.locator('input[name="price"]').fill("62");
  await page.getByTestId("service-save").click();
  await expect(page.getByTestId("service-price")).toHaveText("62 €");

  await signOut(page);
  await page.goto(`/coach/${state.slug}`);
  await expect(page.locator("#prestations")).toContainText("62 €");

  // a qualification added after approval stays "declared" until an admin checks it
  const lea = await userClient(coach.email, coach.password);
  const inserted = await lea.from("coach_qualifications").insert({ coach_id: state.coachId, kind: "cqp", title: "CQP test", status: "verified" }).select("status").single();
  expect(inserted.data?.status).toBe("declared");
});

test("journey 11 — permissions are enforced by the server and the database", async ({ page, browser }) => {
  // unauthenticated: protected areas redirect to sign-in
  for (const path of ["/pro", "/admin", "/reservations", "/messages", "/compte"]) {
    await page.goto(path);
    await expect(page, `${path} requires a session`).toHaveURL(/\/connexion\?next=/);
  }

  // a customer cannot open the admin area (404) nor the coach area
  await signIn(page, customer.email, customer.password);
  expect((await page.goto("/admin"))?.status()).toBe(404);
  expect((await page.goto(`/admin/coachs/${state.coachId}`))?.status()).toBe(404);
  await page.goto("/pro");
  await expect(page).toHaveURL(/\/devenir-coach/);
  expect((await page.request.get(`/api/documents/${state.documentId}`, { maxRedirects: 0 })).status()).toBe(404);

  // a coach cannot open the admin area either
  const coachContext = await browser.newContext();
  const coachPage = await coachContext.newPage();
  await signIn(coachPage, coach.email, coach.password);
  expect((await coachPage.goto("/admin"))?.status()).toBe(404);
  await coachContext.close();

  // ---- straight at the API, bypassing the interface entirely
  const lea = await userClient(coach.email, coach.password);
  const nina = await userClient(customer.email, customer.password);
  const yanis = await userClient("yanis@boldup.test", demoPassword("pending"));
  const admin = await userClient("admin@boldup.test", demoPassword("admin"));
  const anonymous = anonClient();
  const db = serviceClient();

  // a coach cannot approve themselves, by RPC or by writing the column
  expect((await lea.rpc("admin_decide_coach", { p_coach_id: state.coachId, p_decision: "approve" })).error).toBeTruthy();
  expect((await yanis.rpc("admin_decide_coach", { p_coach_id: (await yanis.auth.getUser()).data.user!.id, p_decision: "approve" })).error?.message).toContain("forbidden");
  expect((await yanis.from("coach_profiles").update({ verification_status: "approved" }).neq("slug", "")).error?.message).toContain("protected_field");
  expect((await yanis.rpc("admin_review_document", { p_document_id: state.documentId, p_decision: "approve" })).error?.message).toContain("forbidden");
  const { data: stillPending } = await db.from("coach_profiles").select("verification_status").eq("slug", "yanis-bellamy").single();
  expect(stillPending?.verification_status).toBe("awaiting_review");

  // nobody can promote themselves to admin
  expect((await nina.from("profiles").update({ role: "admin" }).neq("email", "")).error?.message).toContain("protected_field");

  // a customer cannot edit a coach profile or its services
  expect((await nina.from("coach_profiles").update({ bio: "piraté" }).eq("id", state.coachId).select("id")).data).toEqual([]);
  expect((await nina.from("coach_services").update({ price_cents: 1 }).eq("coach_id", state.coachId).select("id")).data).toEqual([]);
  expect((await db.from("coach_profiles").select("bio").eq("id", state.coachId).single()).data?.bio).not.toBe("piraté");

  // another coach cannot see this coach's documents, rows or files
  expect((await yanis.from("coach_documents").select("id").eq("coach_id", state.coachId)).data).toEqual([]);
  expect((await yanis.storage.from("coach-documents").download(state.documentPath)).error).toBeTruthy();
  expect((await yanis.storage.from("coach-documents").createSignedUrl(state.documentPath, 60)).error).toBeTruthy();
  expect((await nina.storage.from("coach-documents").download(state.documentPath)).error).toBeTruthy();
  // …while the owner and the admin can
  expect((await lea.storage.from("coach-documents").createSignedUrl(state.documentPath, 60)).data?.signedUrl).toBeTruthy();
  expect((await admin.storage.from("coach-documents").createSignedUrl(state.documentPath, 60)).data?.signedUrl).toBeTruthy();

  // private data stays private: anonymous visitors, other users, and even admins for messages
  expect((await anonymous.from("profiles").select("id")).data ?? []).toEqual([]);
  expect((await anonymous.from("bookings").select("id")).data ?? []).toEqual([]);
  expect((await yanis.from("bookings").select("id").eq("coach_id", state.coachId)).data).toEqual([]);
  expect((await yanis.from("messages").select("id")).data).toEqual([]);
  expect((await admin.from("messages").select("id")).data).toEqual([]);
  expect((await admin.from("conversations").select("id")).data).toEqual([]);
  expect((await nina.from("profiles").select("id")).data).toHaveLength(1);

  // unauthenticated callers cannot perform protected actions
  expect((await anonymous.rpc("request_booking", { p_service_id: state.serviceId, p_starts_at: new Date().toISOString() })).error).toBeTruthy();
  expect((await anonymous.rpc("submit_coach_profile")).error).toBeTruthy();
  // a booking can only be accepted by its coach
  const { data: booking } = await db.from("bookings").select("id").eq("coach_id", state.coachId).single();
  expect((await nina.rpc("respond_booking", { p_booking_id: booking!.id, p_action: "complete" })).error?.message).toContain("invalid_transition");
  expect((await yanis.rpc("respond_booking", { p_booking_id: booking!.id, p_action: "cancel" })).error?.message).toContain("forbidden");
});

test("the interface is available in French and in English", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.getByRole("banner").getByRole("button", { name: "en", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Find my COACH");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto(`/coach/${state.slug}`);
  await expect(page.getByText("Profile verified by Bold Up")).toBeVisible();
  await expect(page.getByTestId("booking-panel").first()).toContainText("Request a session");
  await page.goto("/connexion");
  await expect(page.locator("h1")).toHaveText("Good to see you again");
  await page.getByRole("button", { name: "fr", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Content de vous revoir");
});
