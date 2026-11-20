import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * End-to-end tests run against a production build of the app and the LOCAL Supabase stack
 * (`npm run db:start`). They never touch a hosted project: global-setup refuses to run
 * if the configured Supabase URL is not local.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/, dependencies: ["desktop"] },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npm run start -- -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 240_000,
        env: { NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_SITE_URL: baseURL },
      },
});
