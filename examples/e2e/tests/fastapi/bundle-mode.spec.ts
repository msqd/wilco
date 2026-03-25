import { test, expect } from "@playwright/test";

/**
 * FastAPI uses a React SPA architecture where components are bundled by Vite
 * at build time, not loaded via loader.js at runtime. The shared bundle-mode
 * tests (which verify loader.js and /api/bundles/ behavior) do not apply.
 *
 * Instead, we verify the SPA loads and renders correctly.
 */
test.describe("Bundle Mode Verification", () => {
  test("SPA renders product list on load", async ({ page }) => {
    await page.goto("/");
    // The React SPA should render the product list
    await expect(page.locator("h3").first()).toBeVisible();
  });
});
