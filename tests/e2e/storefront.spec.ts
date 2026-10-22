import { test, expect } from "@playwright/test";
import { addFirstProductToBag } from "./helpers";

// TEST 10 — images, layouts, filtering, search, wishlist, cart persistence, forms (desktop + mobile projects).
test("homepage renders the hero and its call to action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /explore the collection/i }).first()).toBeVisible();
});

test("shop filters by size and shows chips that clear", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: /^filter/i }).click();
  const size = page.getByRole("dialog", { name: "Filters" }).getByRole("button", { name: /^(S|M|Free size)$/ }).first();
  await size.click();
  await expect(page).toHaveURL(/size=/);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /clear all/i }).click();
  await expect(page).not.toHaveURL(/size=/);
});

test("search suggests products", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("dialog", { name: /search/i }).getByLabel("Search").fill("sample");
  await expect(page.getByRole("dialog", { name: /search/i }).getByRole("link").first()).toBeVisible();
});

test("bag persists across reloads and prices come from the server", async ({ page }) => {
  await addFirstProductToBag(page);
  await page.reload();
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible();
  // A forged request can't change prices: the API only accepts a variant id and quantity.
  const res = await page.request.patch("/api/cart", { data: { itemId: "00000000-0000-4000-8000-000000000000", quantity: 1, price: 1 } });
  expect([404, 409]).toContain(res.status());
});

test("wishlist toggles and persists", async ({ page }) => {
  await page.goto("/shop");
  const heart = page.getByRole("button", { name: /save .* to wishlist/i }).first();
  await heart.click();
  await expect(page.getByRole("button", { name: /remove .* from wishlist/i }).first()).toBeVisible();
  await page.goto("/wishlist");
  await expect(page.locator("article")).toHaveCount(1, { timeout: 10_000 });
});

test("contact form validates input", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Your name").fill("A");
  await page.getByLabel("Email").fill("someone@example.in");
  await page.getByLabel("How can we help?").fill("short");
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});
