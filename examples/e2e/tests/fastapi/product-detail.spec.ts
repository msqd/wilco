import { test, expect } from "@playwright/test";
import { FastAPIAdapter } from "../../src/adapters/index.js";
import { ProductDetailPage, ProductListPage } from "../../src/pages/index.js";

const adapter = new FastAPIAdapter();

test.describe("FastAPI Product Detail", () => {
  test("shows full product details", async ({ page }) => {
    const productDetail = new ProductDetailPage(page, adapter);
    await productDetail.navigate(1);

    // Wait for React to load
    await page.waitForTimeout(1000);

    // Product should be displayed
    await productDetail.expectProductDisplayed();

    // Check for specific content
    const title = await productDetail.getProductTitleText();
    const price = await productDetail.getProductPriceText();

    expect(title.length).toBeGreaterThan(0);
    expect(price).toMatch(/\$?\d+\.\d{2}/);
  });

  test("shows 404 for invalid product ID", async ({ page }) => {
    const productDetail = new ProductDetailPage(page, adapter);
    await productDetail.navigate(99999);

    // Wait for React to load
    await page.waitForTimeout(1000);

    await productDetail.expectNotFound();
  });

  test("back navigation returns to product list", async ({ page }) => {
    // Start on product list
    const productList = new ProductListPage(page, adapter);
    await productList.navigate();

    // Wait for products to load
    await page.waitForTimeout(1000);

    // Click to go to product detail
    await productList.clickProduct(0);

    // Wait for detail page to load
    await page.waitForTimeout(1000);

    // Navigate back
    const productDetail = new ProductDetailPage(page, adapter);
    await productDetail.goBack();

    // Should be back on the list page
    expect(page.url()).toBe(adapter.productListUrl());
  });
});
