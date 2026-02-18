import type { ServerConfig, FrameworkType } from "../server/types.js";

/**
 * CSS selectors for page elements.
 * Different frameworks may render elements differently.
 */
export interface PageSelectors {
  // Product list page
  productGrid: string;
  productCard: string;
  productCardTitle: string;
  productCardPrice: string;
  productCardImage: string;
  productCardLink: string;

  // Product detail page
  productTitle: string;
  productPrice: string;
  productDescription: string;
  productImage: string;
  backLink: string;

  // Admin page
  adminLoginForm: string;
  adminUsernameInput: string;
  adminPasswordInput: string;
  adminLoginButton: string;
  adminProductList: string;
  adminProductRow: string;
}

/**
 * Interface for framework-specific configuration.
 */
export interface FrameworkAdapter {
  /** Framework type identifier */
  readonly type: FrameworkType;

  /** Display name for the framework */
  readonly name: string;

  /** Get server configurations to start */
  getServerConfigs(): ServerConfig[];

  /** Base URL for the main frontend */
  readonly baseUrl: string;

  /** Admin URL */
  readonly adminUrl: string;

  /** Admin login credentials (undefined if no login required) */
  readonly adminCredentials?: {
    username: string;
    password: string;
  };

  /** URL for product list page */
  productListUrl(): string;

  /** URL for product detail page */
  productDetailUrl(id: number): string;

  /** Get CSS selectors for page elements */
  getSelectors(): PageSelectors;

  /** Whether this framework has a live preview feature */
  readonly hasLivePreview: boolean;

  /** Whether this is a React SPA (needs hydration wait) */
  readonly isSPA: boolean;
}
