import { test, expect } from "@playwright/test";
import { FastAPIAdapter } from "../../src/adapters/index.js";
import { ProductListPage } from "../../src/pages/index.js";

const adapter = new FastAPIAdapter();

test.describe("FastAPI Product List", () => {
  test("displays 6 products", async ({ page }) => {
    const productList = new ProductListPage(page, adapter);
    await productList.navigate();

    // Wait for React to hydrate and load products
    await page.waitForTimeout(1000);

    // Should display exactly 6 products
    await productList.expectProductCount(6);
  });

  test("product cards show title, price, and image", async ({ page }) => {
    const productList = new ProductListPage(page, adapter);
    await productList.navigate();

    // Wait for products to load
    await page.waitForTimeout(1000);

    // Get product data
    const titles = await productList.getProductTitles();
    const prices = await productList.getProductPrices();
    const hasImages = await productList.productsHaveImages();

    // Verify products have content
    expect(titles.length).toBe(6);
    expect(prices.length).toBe(6);
    expect(hasImages).toBe(true);

    // Check for expected product names
    expect(titles.some((t) => t.includes("Space Quest"))).toBe(true);
  });

  test("clicking a product navigates to detail page", async ({ page }) => {
    const productList = new ProductListPage(page, adapter);
    await productList.navigate();

    // Wait for products to load
    await page.waitForTimeout(1000);

    // Click the first product
    await productList.clickProduct(0);

    // Should be on a product detail page
    expect(page.url()).toMatch(/\/product\/\d+/);
  });

  test("shows loading state initially", async ({ page }) => {
    // Navigate to the page
    await page.goto(adapter.productListUrl());

    // Page should load without errors
    await page.waitForLoadState("domcontentloaded");

    // After React hydrates, products should appear
    await page.waitForTimeout(2000);
    const productList = new ProductListPage(page, adapter);
    await productList.expectProductsDisplayed();
  });
});
