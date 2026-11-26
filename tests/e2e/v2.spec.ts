import { expect, test } from "@playwright/test";
import { demoPassword, signIn } from "./helpers";

/**
 * V2 — what the client asked for after the first demo: the live map, the home search,
 * clubs, street workout spots, sports events and the three calendar views.
 * Everything here reads the seeded demo scenario (10 clubs, 10 spots, 13 events).
 */

const mapReady = async (page: import("@playwright/test").Page) => {
  await expect(page.getByTestId("map").first()).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
};

test("V2 home — one question, a magnifier, and the events right under it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Trouver mon COACH");

  // "Évènements" is the section that directly follows the hero
  await expect(page.locator("main > section").nth(1)).toHaveAttribute("data-testid", "home-events");
  await expect(page.getByTestId("home-events").getByTestId("event-card").first()).toBeVisible();

  // the magnifier shows every discipline with its icon, and the filters
  await expect(page.getByTestId("home-finder")).toHaveCount(0);
  await page.getByTestId("home-search-open").click();
  const finder = page.getByTestId("home-finder");
  await expect(finder.locator('[data-testid^="home-sport-"]')).toHaveCount(10);
  await expect(finder.locator('[data-testid^="home-sport-"] svg').first()).toBeVisible();
  for (const label of ["Rayon", "Budget par séance", "Disponibilité", "Lieu de séance", "Trier par"]) {
    await expect(finder.getByText(label, { exact: true })).toBeVisible();
  }

  // filters travel to the results
  await finder.getByTestId("home-sport-boxe").click();
  await finder.getByRole("button", { name: "Le week-end" }).click();
  await finder.getByRole("button", { name: "Prix", exact: true }).click();
  await page.getByTestId("home-search").click();
  await page.waitForURL(/\/coachs\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get("sport")).toBe("boxe");
  expect(url.searchParams.get("dispo")).toBe("weekend");
  expect(url.searchParams.get("tri")).toBe("prix");

  // the same panel finds a club, a street workout spot or an event
  await page.goto("/");
  await page.getByTestId("home-search-open").click();
  await page.getByTestId("home-kind-event").click();
  await page.getByTestId("home-search").click();
  await page.waitForURL(/\/evenements/);
  await expect(page.getByTestId("event-count")).toContainText("13");
});

test("V2 map — portraits, coloured pins, bubbles that open, filters and previews in place", async ({ page }) => {
  await page.goto("/carte");
  await mapReady(page);

  // coaches are their portrait; everything else has its own pin, or sits in a counted bubble
  await expect(page.locator('.bu-pin[data-kind="coach"] .bu-pin-avatar img').first()).toBeVisible();
  await expect(page.getByTestId("explore-count")).toContainText("résultats");
  const bubbles = page.locator(".bu-cluster");
  await expect(bubbles.first()).toBeVisible();

  // a bubble opens up: the camera moves in and its pins come apart
  const pinsBefore = await page.locator(".bu-pin").count();
  await bubbles.first().click();
  await expect.poll(() => page.locator(".bu-pin").count(), { timeout: 10_000 }).toBeGreaterThan(pinsBefore);

  // quick filter: street workout spots only (and the address can be shared)
  await page.getByTestId("layer-spots").click();
  await expect(page.getByTestId("explore-count")).toContainText("10 résultats");
  await expect(page.locator('.bu-pin[data-kind="coach"]')).toHaveCount(0);
  await expect(page).toHaveURL(/couche=street-workout/);

  // something nearby is chosen: its pin is selected and its preview opens on the map
  await page.getByTestId("explore-rail").locator("button").first().click();
  const preview = page.getByTestId("map-preview");
  await expect(preview).toBeVisible();
  await expect(page.locator('.bu-pin[data-active="true"]')).toHaveCount(1);
  await expect(page).toHaveURL(/\/carte/); // still on the map
  await preview.getByRole("link", { name: "Voir la fiche" }).click();
  await page.waitForURL(/\/street-workout\/.+/);
  await expect(page.getByTestId("place-name")).toBeVisible();

  // a discipline filter keeps the coaches, clubs and events of that sport
  await page.goto("/carte?sport=boxe");
  await mapReady(page);
  await expect(page.locator('.bu-pin[data-kind="coach"]')).toHaveCount(2);
  await expect(page.locator('.bu-pin[data-kind="street_workout"]')).toHaveCount(0);

  // events carry their date on the map
  await page.goto("/carte?couche=evenements");
  await mapReady(page);
  await expect(page.locator('.bu-pin[data-kind="event"] .bu-pin-label').first()).toBeVisible();
});

test("V2 places — clubs and street workout spots have their own filters and pages", async ({ page }) => {
  await page.goto("/clubs");
  await expect(page.getByTestId("place-count")).toContainText("10 clubs");
  await page.getByTestId("club-sport-boxe").click();
  await expect(page.getByTestId("place-count")).toContainText("2 clubs");
  await page.getByTestId("place-card").filter({ hasText: "Boxing Club du Lac" }).first().click();
  await page.waitForURL("**/club/boxing-club-du-lac");
  await expect(page.getByTestId("place-name")).toHaveText("Boxing Club du Lac");
  await mapReady(page);

  await page.goto("/street-workout");
  await expect(page.getByTestId("place-count")).toContainText("10 spots");
  await page.getByTestId("spot-always-open").click();
  await expect(page.getByTestId("place-count")).toContainText("4 spots");

  // each kind of place keeps to its own pages: gyms under /salles, the others redirect
  await page.goto("/salle/spot-du-port-de-bonneuil");
  await page.waitForURL("**/street-workout/spot-du-port-de-bonneuil");
  await page.goto("/salles");
  await expect(page.getByTestId("venue-card").filter({ hasText: "Boxing Club du Lac" })).toHaveCount(0);
});

test("V2 events — upcoming dates, filters, a detail page and a calendar file", async ({ page, request }) => {
  await page.goto("/evenements");
  await expect(page.getByTestId("event-count")).toContainText("13");
  await page.getByTestId("event-type-trail").click();
  await expect(page.getByTestId("event-count")).toContainText("2");
  await page.getByTestId("event-card").filter({ hasText: "Trail du Bois de Vincennes" }).first().click();
  await page.waitForURL("**/evenement/trail-du-bois-de-vincennes");
  await expect(page.getByTestId("event-name")).toHaveText("Trail du Bois de Vincennes");
  // seeded events are fictional and say so
  await expect(page.getByTestId("event-demo-notice")).toBeVisible();
  await mapReady(page);

  const ics = await request.get("/api/events/trail-du-bois-de-vincennes/ics");
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain("BEGIN:VEVENT");
  expect((await request.get("/api/events/does-not-exist/ics")).status()).toBe(404);
});

test("V2 calendar — week first, day and month one tap away, for booking and for one's sessions", async ({ page }) => {
  await page.goto("/coach/alexandre-moreau");
  const panel = page.getByTestId("booking-panel").first();
  await expect(panel.getByTestId("calendar-view-week")).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByTestId("day-available").first()).toBeVisible();

  await panel.getByTestId("calendar-view-month").click();
  await expect(panel.getByTestId("calendar-view-month")).toHaveAttribute("aria-selected", "true");
  await panel.getByTestId("calendar-view-day").click();
  await expect(panel.getByTestId("calendar-view-day")).toHaveAttribute("aria-selected", "true");
  await panel.getByTestId("slot").first().click();
  await expect(panel.locator('[data-testid="slot"][aria-pressed="true"]')).toHaveCount(1);
  await expect(panel.getByTestId("booking-submit")).toBeEnabled();

  // the customer's own sessions on a calendar, week first
  await signIn(page, "camille@boldup.test", demoPassword("customer"));
  await page.goto("/reservations");
  const calendar = page.getByTestId("bookings-calendar");
  await expect(calendar).toBeVisible();
  await expect(calendar.getByTestId("calendar-view-week")).toHaveAttribute("aria-selected", "true");
  await calendar.getByTestId("calendar-view-month").click();
  await expect(calendar.getByTestId("calendar-view-month")).toHaveAttribute("aria-selected", "true");
});
