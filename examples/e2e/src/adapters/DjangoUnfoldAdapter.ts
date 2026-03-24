import path from "node:path";
import type { FrameworkAdapter, PageSelectors } from "./FrameworkAdapter.js";
import type { ServerConfig, BundleMode } from "../server/types.js";
import { getExamplesDir } from "../server/ServerManager.js";

/**
 * Adapter for Django Unfold example.
 * Single process server-rendered application with Unfold admin theme.
 */
export class DjangoUnfoldAdapter implements FrameworkAdapter {
  readonly type = "django-unfold" as const;
  readonly name = "Django Unfold";
  readonly hasLivePreview = true;
  readonly isSPA = false;
  readonly mode: BundleMode;

  private readonly port: number;

  readonly adminCredentials = {
    username: "admin",
    password: "admin",
  };

  constructor(port = 8000, mode: BundleMode = "dev") {
    this.port = port;
    this.mode = mode;
  }

  get baseUrl(): string {
    return `http://localhost:${this.port}`;
  }

  get adminUrl(): string {
    return "/admin/";
  }

  getServerConfigs(): ServerConfig[] {
    const exampleDir = path.join(getExamplesDir(), "django-unfold");
    const target = this.mode === "prod" ? "start-prod" : "start-dev";

    return [
      {
        name: `django-unfold-${this.mode}`,
        command: "make",
        args: [target, `HTTP_PORT=${this.port}`],
        cwd: exampleDir,
        port: this.port,
        healthCheckPath: "/",
        healthCheckTimeout: 30000,
      },
    ];
  }

  productListUrl(): string {
    return "/";
  }

  productDetailUrl(id: number): string {
    return `/product/${id}/`;
  }

  getSelectors(): PageSelectors {
    return {
      // Product list - wilco component renders these (CSS modules classes)
      productGrid: "[data-wilco-component='store:product_list']",
      productCard:
        "[data-wilco-component='store:product_list'] a[href*='/product/']",
      productCardTitle:
        "[data-wilco-component='store:product_list'] a[href*='/product/'] h2",
      productCardPrice:
        "[data-wilco-component='store:product_list'] a[href*='/product/'] h2 + div",
      productCardImage:
        "[data-wilco-component='store:product_list'] a[href*='/product/'] img",
      productCardLink:
        "[data-wilco-component='store:product_list'] a[href*='/product/']",

      // Product detail - wilco component renders these
      productTitle: "[data-wilco-component='store:product'] h2",
      productPrice: "[data-wilco-component='store:product'] h2 + div",
      productDescription: "[data-wilco-component='store:product'] p",
      productImage: "[data-wilco-component='store:product'] img",
      backLink: "a.back-link",

      // Admin - Django Unfold theme
      adminLoginForm: "form",
      adminUsernameInput: "input[name='username']",
      adminPasswordInput: "input[name='password']",
      adminLoginButton: "button[type='submit'], input[type='submit']",
      adminProductList: "table, .results",
      adminProductRow: "tr, .result",
    };
  }
}
