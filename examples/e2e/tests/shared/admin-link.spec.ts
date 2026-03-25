/**
 * Shared test: verify the admin link in the page header navigates to admin.
 *
 * All full-framework examples render an "Admin" link in the page header.
 * This test clicks it and verifies we reach the admin panel.
 */
import { test, expect } from "@playwright/test";

export function adminLinkTest(opts: {
  /** URL path for a page that has the admin link in its header */
  pagePath: string;
}) {
  test("header admin link navigates to admin panel", async ({ page }) => {
    await page.goto(opts.pagePath);

    // Find the admin link in the header
    const adminLink = page.locator("header").getByRole("link", { name: "Admin" });
    await expect(adminLink).toBeVisible();

    // Verify the href includes trailing slash
    const href = await adminLink.getAttribute("href");
    expect(href, "Admin link should include trailing slash").toMatch(/\/admin\/$/);

    // Click and verify we reach admin
    await adminLink.click();
    await page.waitForLoadState("networkidle");

    // URL should contain /admin/
    expect(page.url()).toContain("/admin/");
  });
}
