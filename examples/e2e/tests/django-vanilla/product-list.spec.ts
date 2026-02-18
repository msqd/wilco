import { test, expect } from "@playwright/test";
import { DjangoVanillaAdapter } from "../../src/adapters/index.js";
import { ProductListPage } from "../../src/pages/index.js";

const adapter = new DjangoVanillaAdapter();

test.describe("Django Vanilla Product List", () => {
  test("displays 6 products", async ({ page }) => {
    const productList = new ProductListPage(page, adapter);
    await productList.navigate();

    // Should display exactly 6 products
    await productList.expectProductCount(6);
  });

  test("product cards show title, price, and image", async ({ page }) => {
    const productList = new ProductListPage(page, adapter);
    await productList.navigate();

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

    // Click the first product
    await productList.clickProduct(0);

    // Should be on a product detail page
    expect(page.url()).toMatch(/\/product\/\d+/);
  });
});
