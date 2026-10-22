import { test, expect } from "@playwright/test";
import { adminLogin, uid } from "./helpers";

test.describe.configure({ mode: "serial" });
const name = `E2E Silk Kurta ${uid()}`;

// TEST 1 + 2 + 11 — create a product with images, sizes, prices and stock; it appears on the storefront without a redeploy.
test("admin creates and publishes a product", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/products/new");
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Product SKU").fill(`E2E-${uid().toUpperCase()}`);
  await page.getByLabel("Selling price, excl. GST (₹)").fill("1999");
  await page.getByPlaceholder(/paste an image url/i).fill("https://res.cloudinary.com/demo/image/upload/sample.jpg");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Sizes").fill("S, M");
  await page.getByRole("button", { name: /generate/i }).click();
  for (const input of await page.getByLabel("Stock", { exact: true }).all()) await input.fill("4");
  await page.getByRole("button", { name: /save and publish/i }).click();
  await expect(page.getByText(/changes are live/i)).toBeVisible();

  await page.goto(`/search?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name })).toBeVisible();
});

// TEST 3 — homepage edits publish without a redeploy.
test("admin edits the hero and publishes the homepage", async ({ page }) => {
  const heading = `Woven for ${uid()}, today.`;
  await adminLogin(page);
  await page.goto("/admin/homepage");
  await page.getByRole("button", { name: /^Hero/ }).first().click();
  await page.getByLabel("Headline").fill(heading);
  await expect(page.getByText(/draft saved/i)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText(/published/i)).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(heading.split(",")[0]);
});
