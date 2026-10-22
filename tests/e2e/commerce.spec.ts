import { test, expect } from "@playwright/test";
import { adminLogin, addFirstProductToBag, uid } from "./helpers";

test.describe.configure({ mode: "serial" });

// Enables COD so checkout can run without Razorpay keys.
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await adminLogin(page);
  await page.goto("/admin/payments");
  const cod = page.getByLabel("Cash on delivery");
  if (!(await cod.isChecked())) await cod.check();
  await page.getByRole("button", { name: /save settings/i }).click();
  await expect(page.getByRole("status")).toContainText(/saved/i);
  await page.close();
});

let orderUrl = "";

// TEST 4 + 5 — choose size/colour, checkout, stock validated and reserved.
test("customer checks out with cash on delivery", async ({ page }) => {
  await addFirstProductToBag(page);
  await page.goto("/checkout");
  await page.getByLabel("Email").fill(`e2e-${uid()}@example.in`);
  await page.getByLabel("Full name").first().fill("Test Shopper");
  await page.getByLabel("Mobile number").first().fill("9876543210");
  await page.getByLabel("House / flat, street").first().fill("12 MG Road");
  await page.getByLabel("City").first().fill("Kochi");
  await page.getByLabel("PIN code").first().fill("682001");
  await page.getByLabel("State").first().selectOption("Kerala");
  await page.getByLabel(/cash on delivery/i).check();
  await page.getByRole("button", { name: /place order/i }).last().click();
  await expect(page).toHaveURL(/order-success/);
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
  await page.getByRole("link", { name: /view order/i }).click();
  orderUrl = page.url();
  await expect(page.getByText(/confirmed/i).first()).toBeVisible();
});

// TEST 8 — another visitor can't open the order without its secret link.
test("orders aren't visible without the owner's link", async ({ browser }) => {
  const stranger = await browser.newPage();
  const res = await stranger.goto(orderUrl.split("?")[0]);
  expect(res?.status()).toBe(404);
  await stranger.close();
});

// TEST 7 — staff fulfil the order and record shipping.
test("admin marks the order shipped with tracking", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/orders");
  await page.locator("table tbody tr a").first().click();
  await page.getByLabel("Carrier").fill("Delhivery");
  await page.getByLabel("Tracking number").fill(`AWB${uid()}`);
  await page.getByRole("button", { name: /save shipping details/i }).click();
  await page.getByLabel("Move to").selectOption("shipped");
  await page.getByRole("button", { name: /mark shipped/i }).click();
  await expect(page.getByText(/marked shipped/i)).toBeVisible();
});
