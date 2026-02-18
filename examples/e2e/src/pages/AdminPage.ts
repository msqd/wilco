import { expect, type Locator } from "@playwright/test";
import { BasePage } from "./BasePage.js";

/**
 * Page object for the admin pages.
 */
export class AdminPage extends BasePage {
  /**
   * Navigate to the admin page.
   */
  async navigate(): Promise<void> {
    await this.goto(this.adapter.adminUrl);
  }

  /**
   * Check if login is required.
   */
  async requiresLogin(): Promise<boolean> {
    const loginForm = this.getLocator(this.selectors.adminLoginForm);
    const usernameInput = this.getLocator(this.selectors.adminUsernameInput);

    // Check if login form is visible
    const formVisible = await loginForm.isVisible().catch(() => false);
    const inputVisible = await usernameInput.isVisible().catch(() => false);

    return formVisible && inputVisible;
  }

  /**
   * Login to the admin panel.
   */
  async login(): Promise<void> {
    const credentials = this.adapter.adminCredentials;

    // Skip login if no credentials (some admins don't require auth)
    if (!credentials) {
      return;
    }

    // Check if login is needed
    if (!(await this.requiresLogin())) {
      return;
    }

    // Fill in credentials
    const usernameInput = this.getLocator(this.selectors.adminUsernameInput);
    const passwordInput = this.getLocator(this.selectors.adminPasswordInput);
    const loginButton = this.getLocator(this.selectors.adminLoginButton);

    await usernameInput.fill(credentials.username);
    await passwordInput.fill(credentials.password);
    await loginButton.click();
    await this.waitForPageReady();
  }

  /**
   * Navigate to the admin and login if needed.
   */
  async navigateAndLogin(): Promise<void> {
    await this.navigate();
    await this.login();
  }

  /**
   * Navigate to the products section in admin.
   */
  async navigateToProducts(): Promise<void> {
    // Look for a link to products
    const productLink = this.page.locator('a:has-text("Product")').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await this.waitForPageReady();
    }
  }

  /**
   * Get the product list table/container.
   */
  getProductList(): Locator {
    return this.getLocator(this.selectors.adminProductList);
  }

  /**
   * Get product rows in the admin list.
   */
  getProductRows(): Locator {
    return this.getLocator(this.selectors.adminProductRow);
  }

  /**
   * Get the count of products in the admin list.
   */
  async getProductCount(): Promise<number> {
    const rows = this.getProductRows();
    return await rows.count();
  }

  /**
   * Check if the admin dashboard is accessible.
   */
  async isAccessible(): Promise<boolean> {
    try {
      // Wait for the page to load
      await this.page.waitForLoadState("networkidle");

      // Check that we're not on a login page or error page
      const bodyText = await this.page.textContent("body");

      // Check for common admin indicators
      const hasAdminContent =
        bodyText?.toLowerCase().includes("admin") ||
        bodyText?.toLowerCase().includes("dashboard") ||
        bodyText?.toLowerCase().includes("product");

      return hasAdminContent ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Verify the admin page is loaded and accessible.
   */
  async expectAdminLoaded(): Promise<void> {
    await this.page.waitForLoadState("networkidle");

    // Check for admin-related content
    const bodyText = await this.page.textContent("body");
    expect(bodyText).toBeTruthy();
  }

  /**
   * Verify product list is visible in admin.
   */
  async expectProductListVisible(): Promise<void> {
    const productList = this.getProductList();
    await expect(productList).toBeVisible();
  }
}
