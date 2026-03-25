/**
 * Shared bundle-mode verification tests.
 *
 * These tests verify that bundles are loaded from the correct source:
 * - Dev mode: bundles fetched from /api/bundles/{name}.js
 * - Prod mode: bundles fetched from static files (manifest-based)
 *
 * Each framework's test directory imports and runs these.
 */
import { test, expect, type Page } from "@playwright/test";

/**
 * Collect network requests during page navigation.
 */
async function collectRequests(
  page: Page,
  url: string,
): Promise<string[]> {
  const urls: string[] = [];
  page.on("request", (req) => urls.push(req.url()));
  await page.goto(url);
  // Wait for components to render (wilco loader + React hydration)
  await page.waitForTimeout(3000);
  return urls;
}

export function bundleModeTests(opts: {
  /** URL path for a page that renders wilco components */
  pagePath: string;
  /** Whether this is a Django example (uses /static/wilco/) */
  isDjango?: boolean;
}) {
  test("loads bundles from the correct source", async ({
    page,
  }, testInfo) => {
    const isProd = testInfo.project.name.endsWith("-prod");
    const urls = await collectRequests(page, opts.pagePath);

    const apiBundleRequests = urls.filter(
      (u) => u.includes("/api/bundles/") && u.endsWith(".js"),
    );
    const staticBundleRequests = urls.filter(
      (u) =>
        u.includes("/static/wilco/bundles/") ||
        u.includes("/wilco-static/wilco/bundles/"),
    );
    const manifestRequests = urls.filter(
      (u) => u.includes("manifest.json") && u.includes("wilco"),
    );

    if (isProd) {
      expect(
        apiBundleRequests,
        "Prod mode should NOT load bundles from API",
      ).toHaveLength(0);
      expect(
        staticBundleRequests.length,
        "Prod mode should load bundles from static files",
      ).toBeGreaterThan(0);
      expect(
        manifestRequests.length,
        "Prod mode should fetch the manifest",
      ).toBeGreaterThan(0);
    } else {
      expect(
        apiBundleRequests.length,
        "Dev mode should load bundles from API",
      ).toBeGreaterThan(0);
      expect(
        staticBundleRequests,
        "Dev mode should NOT load bundles from static files",
      ).toHaveLength(0);
    }
  });

  test("loader script has correct mode attribute", async ({
    page,
  }, testInfo) => {
    const isProd = testInfo.project.name.endsWith("-prod");
    await page.goto(opts.pagePath);
    await page.waitForTimeout(1000);

    if (isProd) {
      const manifestScript = page.locator(
        'script[src*="loader.js"][data-wilco-manifest]',
      );
      await expect(
        manifestScript,
        "Prod mode loader should have data-wilco-manifest attribute",
      ).toHaveCount(1);
    }
  });
}
