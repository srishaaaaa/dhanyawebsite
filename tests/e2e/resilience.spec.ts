import { test, expect } from "@playwright/test";

// TEST 12 + 13 — usable without WebGL and with reduced motion (project disables WebGL and sets reducedMotion).
test("homepage works without WebGL and with reduced motion", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("text=Skip intro")).toHaveCount(0); // intro is skipped for reduced motion
  await page.getByRole("link", { name: /explore the collection/i }).first().click();
  await expect(page).toHaveURL(/\/shop/);
  expect(errors).toEqual([]);
});

test("missing pages show a helpful 404", async ({ page }) => {
  const res = await page.goto("/products/this-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link", { name: /shop the collection/i })).toBeVisible();
});
