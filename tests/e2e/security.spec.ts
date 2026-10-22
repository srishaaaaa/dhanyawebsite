import { test, expect } from "@playwright/test";
import { uid } from "./helpers";

// TEST 9 — ordinary users can't reach admin by URL, request or role tampering.
test("signed-out visitors are sent to the admin login", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("a registered customer can't open the admin", async ({ page }) => {
  await page.goto("/account/register");
  await page.getByLabel("Full name").fill("Curious Customer");
  await page.getByLabel("Email").fill(`cust-${uid()}@example.in`);
  await page.getByLabel(/^Password/).fill("a-long-password-123");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/account/);
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\/unauthorized/);
  // Admin-only API routes refuse too.
  expect((await page.request.get("/admin/orders/export")).status()).toBe(401);
});

test("webhooks reject unsigned payloads", async ({ request }) => {
  const res = await request.post("/api/webhooks/razorpay", { data: { event: "payment.captured", payload: {} } });
  expect(res.status()).toBe(401);
});

test("the reservation cron needs its secret", async ({ request }) => {
  expect((await request.get("/api/cron/release-reservations")).status()).toBe(401);
});
