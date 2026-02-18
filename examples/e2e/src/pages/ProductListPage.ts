import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage.js";

/**
 * Page object for the product list page.
 */
export class ProductListPage extends BasePage {
  /**
   * Navigate to the product list page.
   */
  async navigate(): Promise<void> {
    await this.goto(this.adapter.productListUrl());
  }

  /**
   * Get the product grid container.
   */
  getProductGrid(): Locator {
    return this.getLocator(this.selectors.productGrid);
  }

  /**
   * Get all product cards on the page.
   */
  getProductCards(): Locator {
    return this.getLocator(this.selectors.productCard);
  }

  /**
   * Get the count of product cards.
   */
  async getProductCount(): Promise<number> {
    const cards = this.getProductCards();
    return await cards.count();
  }

  /**
   * Get product card titles.
   */
  async getProductTitles(): Promise<string[]> {
    const titleLocator = this.getLocator(this.selectors.productCardTitle);
    const count = await titleLocator.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await titleLocator.nth(i).textContent();
      if (text) {
        titles.push(text.trim());
      }
    }

    return titles;
  }

  /**
   * Get product card prices.
   */
  async getProductPrices(): Promise<string[]> {
    const priceLocator = this.getLocator(this.selectors.productCardPrice);
    const count = await priceLocator.count();
    const prices: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await priceLocator.nth(i).textContent();
      if (text) {
        prices.push(text.trim());
      }
    }

    return prices;
  }

  /**
   * Check if product cards have images.
   */
  async productsHaveImages(): Promise<boolean> {
    const imageLocator = this.getLocator(this.selectors.productCardImage);
    const count = await imageLocator.count();
    return count > 0;
  }

  /**
   * Click on a product card to navigate to its detail page.
   */
  async clickProduct(index: number): Promise<void> {
    const links = this.getLocator(this.selectors.productCardLink);
    await links.nth(index).click();
    await this.waitForPageReady();
  }

  /**
   * Click on a product by its name.
   */
  async clickProductByName(name: string): Promise<void> {
    const link = this.page.locator(`a:has-text("${name}")`);
    await link.first().click();
    await this.waitForPageReady();
  }

  /**
   * Verify the page displays the expected number of products.
   */
  async expectProductCount(expected: number): Promise<void> {
    const cards = this.getProductCards();
    await expect(cards).toHaveCount(expected);
  }

  /**
   * Verify products are displayed with titles and prices.
   */
  async expectProductsDisplayed(): Promise<void> {
    // Wait for products to load
    await expect(this.getProductCards().first()).toBeVisible();

    // Check that at least one product has a title and price
    const titles = await this.getProductTitles();
    const prices = await this.getProductPrices();

    expect(titles.length).toBeGreaterThan(0);
    expect(prices.length).toBeGreaterThan(0);
  }
}
