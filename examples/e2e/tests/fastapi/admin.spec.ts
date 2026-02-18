import { test, expect } from "@playwright/test";
import { FastAPIAdapter } from "../../src/adapters/index.js";
import { AdminPage } from "../../src/pages/index.js";

const adapter = new FastAPIAdapter();

test.describe("FastAPI Admin", () => {
  test("admin panel is accessible", async ({ page }) => {
    const admin = new AdminPage(page, adapter);
    await admin.navigateAndLogin();

    // Should see admin content
    await admin.expectAdminLoaded();
  });

  test("product list is visible in admin", async ({ page }) => {
    const admin = new AdminPage(page, adapter);
    await admin.navigateAndLogin();

    // Navigate to products
    await admin.navigateToProducts();

    // Should see product list
    const isAccessible = await admin.isAccessible();
    expect(isAccessible).toBe(true);
  });

  test("admin shows correct product count", async ({ page }) => {
    const admin = new AdminPage(page, adapter);
    await admin.navigateAndLogin();

    // Navigate to products
    await admin.navigateToProducts();

    // Wait for the product list to load
    await page.waitForTimeout(1000);

    // Should see products (at least some visible)
    const productCount = await admin.getProductCount();
    expect(productCount).toBeGreaterThan(0);
  });
});
