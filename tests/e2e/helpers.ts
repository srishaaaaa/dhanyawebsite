import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "", password: process.env.E2E_ADMIN_PASSWORD ?? "" };

export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Opens the first in-stock demo product and adds its first available size to the bag. */
export async function addFirstProductToBag(page: Page) {
  await page.goto("/shop?stock=1");
  await page.locator("article h3 a").first().click();
  const sizes = page.getByRole("radiogroup").last().getByRole("radio");
  const n = await sizes.count();
  for (let i = 0; i < n; i++) {
    const s = sizes.nth(i);
    if (!((await s.getAttribute("aria-label")) ?? "").includes("sold out")) { await s.click(); break; }
  }
  await page.getByRole("button", { name: /add to bag/i }).click();
  await expect(page.getByRole("dialog", { name: /shopping bag/i })).toBeVisible();
}

export const uid = () => Math.random().toString(36).slice(2, 8);
