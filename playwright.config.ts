import { defineConfig, devices } from "@playwright/test";

// End-to-end acceptance tests. Needs a migrated database with `npm run db:seed` and `npm run db:seed:demo`,
// plus E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD matching the seeded owner (no two-step sign-in on that account).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure", locale: "en-IN", timezoneId: "Asia/Kolkata" },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run build && npm run start", url: "http://localhost:3000", timeout: 240_000, reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /storefront\.spec/ },
    { name: "no-webgl-reduced-motion", use: { ...devices["Desktop Chrome"], contextOptions: { reducedMotion: "reduce" }, launchOptions: { args: ["--disable-webgl", "--disable-3d-apis"] } }, testMatch: /resilience\.spec/ },
  ],
});
