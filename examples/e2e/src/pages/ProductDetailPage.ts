import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage.js";

/**
 * Page object for the product detail page.
 */
export class ProductDetailPage extends BasePage {
  /**
   * Navigate to a specific product's detail page.
   */
  async navigate(productId: number): Promise<void> {
    await this.goto(this.adapter.productDetailUrl(productId));
  }

  /**
   * Get the product title element.
   */
  getProductTitle(): Locator {
    return this.getLocator(this.selectors.productTitle);
  }

  /**
   * Get the product title text.
   */
  async getProductTitleText(): Promise<string> {
    const title = this.getProductTitle();
    const text = await title.textContent();
    return text?.trim() ?? "";
  }

  /**
   * Get the product price element.
   */
  getProductPrice(): Locator {
    return this.getLocator(this.selectors.productPrice);
  }

  /**
   * Get the product price text.
   */
  async getProductPriceText(): Promise<string> {
    const price = this.getProductPrice();
    const text = await price.textContent();
    return text?.trim() ?? "";
  }

  /**
   * Get the product description element.
   */
  getProductDescription(): Locator {
    return this.getLocator(this.selectors.productDescription);
  }

  /**
   * Get the product description text.
   */
  async getProductDescriptionText(): Promise<string> {
    const description = this.getProductDescription();
    const text = await description.textContent();
    return text?.trim() ?? "";
  }

  /**
   * Get the product image element.
   */
  getProductImage(): Locator {
    return this.getLocator(this.selectors.productImage);
  }

  /**
   * Check if the product has an image.
   */
  async hasImage(): Promise<boolean> {
    const image = this.getProductImage();
    return await image.isVisible();
  }

  /**
   * Get the back link element.
   */
  getBackLink(): Locator {
    return this.getLocator(this.selectors.backLink);
  }

  /**
   * Click the back link to return to the product list.
   */
  async goBack(): Promise<void> {
    const backLink = this.getBackLink();
    await backLink.click();
    await this.waitForPageReady();
  }

  /**
   * Verify the product detail page is displayed correctly.
   */
  async expectProductDisplayed(): Promise<void> {
    // Wait for the title to be visible
    await expect(this.getProductTitle()).toBeVisible();

    // Check that essential elements are present
    const title = await this.getProductTitleText();
    const price = await this.getProductPriceText();

    expect(title.length).toBeGreaterThan(0);
    expect(price.length).toBeGreaterThan(0);
  }

  /**
   * Verify this is a 404 page.
   */
  async expectNotFound(): Promise<void> {
    // Check for common 404 indicators
    const bodyText = await this.page.textContent("body");
    const is404 =
      bodyText?.toLowerCase().includes("not found") ||
      bodyText?.toLowerCase().includes("404") ||
      (await this.page.locator("h1:has-text('404')").isVisible()) ||
      (await this.page.locator("h1:has-text('Not Found')").isVisible());

    expect(is404).toBeTruthy();
  }
}
