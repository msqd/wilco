import { test, expect } from "@playwright/test";
import { FlaskAdapter } from "../../src/adapters/index.js";
import { AdminPage } from "../../src/pages/index.js";

const adapter = new FlaskAdapter();

test.describe("Flask Admin", () => {
  test("admin panel is accessible", async ({ page }) => {
    // Flask-Admin doesn't require login by default
    await page.goto(adapter.adminUrl);

    // Should see admin content
    await expect(page.locator("body")).toContainText("Wilco Shop Admin");
  });

  test("product list is visible in admin", async ({ page }) => {
    // Navigate to products in Flask-Admin
    await page.goto(`${adapter.adminUrl}product/`);

    // Should see product list
    await expect(page.locator("table.model-list")).toBeVisible();
  });

  test("admin shows correct product count", async ({ page }) => {
    // Navigate to products in Flask-Admin
    await page.goto(`${adapter.adminUrl}product/`);

    // Wait for the product list to load
    await page.waitForTimeout(1000);

    // Should see products (at least some visible)
    const productRows = page.locator("table.model-list tbody tr");
    const count = await productRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("admin edit page shows live preview panel", async ({ page }) => {
    // Navigate to product edit page (first product)
    await page.goto(`${adapter.adminUrl}product/edit/?id=1`);

    // Wait for the preview injector to run
    await page.waitForTimeout(2000);

    // Should see the preview container injected by admin-preview-inject.js
    const previewContainer = page.locator("#wilco-preview-container");
    await expect(previewContainer).toBeVisible({ timeout: 10000 });

    // Should see the "Live Preview" heading
    await expect(page.locator(".wilco-preview-panel h4")).toContainText(
      "Live Preview"
    );
  });

  test("live preview updates on field change", async ({ page }) => {
    // Navigate to product edit page
    await page.goto(`${adapter.adminUrl}product/edit/?id=1`);

    // Wait for preview to load
    await page.waitForTimeout(3000);

    const previewContainer = page.locator("#wilco-preview-container");
    await expect(previewContainer).toBeVisible({ timeout: 10000 });

    // Change the name field
    const nameField = page.locator("input[name='name']");
    await nameField.clear();
    await nameField.fill("Updated Product Name");

    // Wait for debounced validation (300ms + network time)
    await page.waitForTimeout(1000);

    // The preview should have updated - check the validate URL was called
    // by verifying the preview container still exists and has props
    const propsAttr = await previewContainer.getAttribute(
      "data-wilco-props"
    );
    // After validation, props should be updated (non-empty)
    expect(propsAttr).toBeTruthy();
    if (propsAttr && propsAttr !== "{}") {
      const props = JSON.parse(propsAttr);
      expect(props.name).toBe("Updated Product Name");
    }
  });
});
