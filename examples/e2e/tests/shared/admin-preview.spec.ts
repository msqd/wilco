/**
 * Shared test: verify admin live preview loads without errors.
 *
 * The live preview depends on loader.js loading the product_preview component.
 * In prod mode this requires the manifest attribute to be set correctly.
 * This test catches regressions where the component fails to load.
 *
 * Supports two preview architectures:
 * - Inject-based (Flask, FastAPI, Starlette): #wilco-preview-container with .wilco-preview-panel
 * - Server-side (Django): [data-wilco-component] rendered inline by LivePreviewAdminMixin
 */
import { test, expect } from "@playwright/test";

export function adminPreviewTest(opts: {
  /** Full path to a product edit page (e.g., "/admin/product/edit/1") */
  editPath: string;
  /** Login credentials if admin requires authentication */
  credentials?: { username: string; password: string };
  /** CSS selector for the preview container (default: auto-detect) */
  previewSelector?: string;
  /** Text of a tab to click before checking the preview (e.g., "Preview") */
  clickTab?: string;
}) {
  test("admin live preview loads component without errors", async ({
    page,
  }) => {
    // Collect console errors during page load
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(opts.editPath);

    // Handle login if required (e.g., Django admin)
    if (opts.credentials) {
      const loginForm = page.locator("form");
      const usernameInput = page.locator("input[name='username']");
      if (
        (await loginForm.isVisible().catch(() => false)) &&
        (await usernameInput.isVisible().catch(() => false))
      ) {
        await usernameInput.fill(opts.credentials.username);
        await page.locator("input[name='password']").fill(opts.credentials.password);
        await page.locator("input[type='submit'], button[type='submit']").click();
        await page.waitForLoadState("networkidle");

        // After login, navigate to the edit page again
        await page.goto(opts.editPath);
      }
    }

    // Click a tab if needed (e.g., Django Unfold has tabbed admin)
    if (opts.clickTab) {
      // Use substring match to handle emoji prefixes (e.g., "👁️ Preview")
      const tab = page.getByText(opts.clickTab, { exact: false });
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(1000);
      }
    }

    // Wait for preview scripts to inject and components to render
    await page.waitForTimeout(3000);

    // Find the preview container (inject-based or server-side)
    const selector =
      opts.previewSelector ??
      "#wilco-preview-container, [data-wilco-component='store:product_preview']";
    const previewContainer = page.locator(selector).first();
    await expect(previewContainer).toBeVisible({ timeout: 10000 });

    // The preview should NOT show a "Failed to load" error
    const failedText = page.getByText("Failed to load component");
    await expect(failedText).toHaveCount(0);

    // The preview should NOT show $NaN (broken price from empty props)
    const nanText = previewContainer.getByText("$NaN");
    await expect(
      nanText,
      "Preview should not show $NaN (indicates empty props / broken validation)",
    ).toHaveCount(0);

    // The preview should show a valid price (e.g., $29.99)
    // Use .first() because the preview may show price in both list and detail views
    await expect(
      previewContainer.getByText(/\$\d+\.\d{2}/).first(),
      "Preview should display a formatted price",
    ).toBeVisible({ timeout: 10000 });

    // No component loading errors in console
    const componentErrors = errors.filter(
      (e) =>
        e.includes("Failed to render component") ||
        e.includes("Component not found"),
    );
    expect(
      componentErrors,
      "No component loading errors in console",
    ).toHaveLength(0);
  });
}
