import { expect, test } from "@playwright/test";
import { demoPassword, expectNoHorizontalOverflow, signIn } from "./helpers";

/** Journey 10 — the key screens on a phone: usable navigation, no clipped or overflowing layout. */

test("home, search and coach profile work on a phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("navigation", { name: "Menu" }).last()).toBeVisible(); // bottom tab bar

  // search: the map with a bottom sheet of results, switchable to a list
  await page.goto("/coachs?sport=boxe");
  await expect(page.getByTestId("map")).toHaveAttribute("data-ready", "true", { timeout: 30_000 });
  await expectNoHorizontalOverflow(page);
  await expect(page.locator('[data-testid="coach-card"]:visible').first()).toBeVisible();
  await page.getByTestId("view-toggle").click();
  await expect(page.getByTestId("result-count")).toBeVisible();
  await expect(page.locator('[data-testid="coach-card"]:visible').filter({ hasText: "Alexandre Moreau" })).toBeVisible();
  await page.getByTestId("view-toggle").click();

  // a pin opens the matching card in the sheet
  await page.locator('.bu-pin[data-kind="coach"]').first().click();
  await expect(page.locator('.bu-pin[data-kind="coach"][data-active="true"]')).toHaveCount(1);

  // coach profile: sticky booking bar opens the booking sheet
  await page.goto("/coach/alexandre-moreau");
  await expect(page.getByTestId("coach-name")).toHaveText("Alexandre Moreau");
  await expectNoHorizontalOverflow(page);
  await page.getByTestId("booking-open").click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByTestId("booking-panel")).toBeVisible();
  await sheet.getByTestId("day-available").first().click();
  await sheet.getByTestId("slot").first().click();
  await expect(sheet.getByTestId("booking-submit")).toBeEnabled();
});

test("the coach area works on a phone", async ({ page }) => {
  await signIn(page, "alexandre@boldup.test", demoPassword("coach"));
  await expect(page.getByTestId("pro-greeting")).toContainText("Alexandre");
  await expectNoHorizontalOverflow(page);
  for (const path of ["/pro/demandes", "/pro/agenda", "/pro/agenda?vue=disponibilites", "/pro/profil", "/pro/documents", "/pro/messages"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("the admin review screen works on a phone", async ({ page }) => {
  await signIn(page, "admin@boldup.test", demoPassword("admin"));
  await expectNoHorizontalOverflow(page);
  await page.getByTestId("queue-review").first().click();
  await expect(page.getByTestId("decision-panel")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("sign-up and customer screens fit a phone", async ({ page }) => {
  for (const path of ["/inscription", "/inscription?role=coach", "/connexion", "/salles", "/confidentialite"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  await signIn(page, "camille@boldup.test", demoPassword("customer"));
  for (const path of ["/reservations", "/favoris", "/messages", "/compte", "/notifications"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
