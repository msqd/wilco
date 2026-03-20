import type { FrameworkAdapter, PageSelectors } from "./FrameworkAdapter.js";
import type { ServerConfig, BundleMode } from "../server/types.js";

/**
 * Adapter for the WSGI Minimal example.
 * This is a raw WSGI application without any framework.
 */
export class WsgiMinimalAdapter implements FrameworkAdapter {
  readonly type = "wsgi-minimal" as const;
  readonly name = "WSGI Minimal";
  readonly hasLivePreview = false;
  readonly isSPA = false;
  readonly mode: BundleMode;

  // WSGI Minimal has no admin interface
  readonly adminCredentials = undefined;

  private readonly port: number;

  constructor(port = 8600, mode: BundleMode = "dev") {
    this.port = port;
    this.mode = mode;
  }

  get baseUrl(): string {
    return `http://localhost:${this.port}`;
  }

  get adminUrl(): string {
    // No admin in minimal example
    return this.baseUrl;
  }

  getServerConfigs(): ServerConfig[] {
    const env: Record<string, string> = {};

    if (this.mode === "prod") {
      env.WILCO_BUILD_DIR = "dist/wilco";
    }

    return [
      {
        name: `wsgi-minimal-${this.mode}`,
        command: "make",
        args: ["start", `HTTP_PORT=${this.port}`],
        cwd: "../wsgi-minimal",
        port: this.port,
        healthCheckPath: "/",
        ...(Object.keys(env).length > 0 ? { env } : {}),
      },
    ];
  }

  productListUrl(): string {
    return `${this.baseUrl}/`;
  }

  productDetailUrl(id: number): string {
    return `${this.baseUrl}/products/${id}`;
  }

  getSelectors(): PageSelectors {
    return {
      // Product list - wilco component renders these (CSS modules classes)
      productGrid: "[data-wilco-component='store:product_list']",
      productCard: "[data-wilco-component='store:product_list'] a[href*='/products/']",
      productCardTitle: "[data-wilco-component='store:product_list'] a[href*='/products/'] h2",
      productCardPrice: "[data-wilco-component='store:product_list'] a[href*='/products/'] h2 + div",
      productCardImage: "[data-wilco-component='store:product_list'] a[href*='/products/'] img",
      productCardLink: "[data-wilco-component='store:product_list'] a[href*='/products/']",

      // Product detail - wilco component renders these
      productTitle: "[data-wilco-component='store:product'] h2",
      productPrice: "[data-wilco-component='store:product'] h2 + div",
      productDescription: "[data-wilco-component='store:product'] p",
      productImage: "[data-wilco-component='store:product'] img",
      backLink: "a.back-link",

      // Admin page (not applicable for minimal example)
      adminLoginForm: "form",
      adminUsernameInput: 'input[name="username"]',
      adminPasswordInput: 'input[name="password"]',
      adminLoginButton: 'button[type="submit"]',
      adminProductList: "table",
      adminProductRow: "tbody tr",
    };
  }
}
