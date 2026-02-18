import { type Page, type Locator, expect } from "@playwright/test";
import type { FrameworkAdapter, PageSelectors } from "../adapters/FrameworkAdapter.js";

/**
 * Base page object with common functionality.
 */
export class BasePage {
  protected readonly page: Page;
  protected readonly adapter: FrameworkAdapter;
  protected readonly selectors: PageSelectors;

  constructor(page: Page, adapter: FrameworkAdapter) {
    this.page = page;
    this.adapter = adapter;
    this.selectors = adapter.getSelectors();
  }

  /**
   * Navigate to a URL and wait for the page to be ready.
   * For SPAs, this includes waiting for hydration.
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForPageReady();
  }

  /**
   * Wait for the page to be fully loaded and ready.
   * SPAs need extra time for React hydration.
   */
  async waitForPageReady(): Promise<void> {
    if (this.adapter.isSPA) {
      // For SPAs, don't use networkidle - Vite HMR keeps connections open
      // Instead, wait for DOM to be ready
      await this.page.waitForLoadState("domcontentloaded");
      // Wait for React to hydrate
      await this.page.waitForTimeout(500);
    } else {
      // For server-rendered pages, wait for network to be idle
      await this.page.waitForLoadState("networkidle");
    }
  }

  /**
   * Get the page title.
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Check if the page contains specific text.
   */
  async containsText(text: string): Promise<boolean> {
    const content = await this.page.textContent("body");
    return content?.includes(text) ?? false;
  }

  /**
   * Get a locator for an element using multiple possible selectors.
   * Tries each selector in order until one matches.
   */
  protected getLocator(selectorString: string): Locator {
    // Split by comma and try each selector
    const selectors = selectorString.split(",").map((s) => s.trim());

    if (selectors.length === 1) {
      return this.page.locator(selectors[0]);
    }

    // Use the first selector that matches
    return this.page.locator(selectors.join(", "));
  }
}
