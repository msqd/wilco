import path from "node:path";
import type { FrameworkAdapter, PageSelectors } from "./FrameworkAdapter.js";
import type { ServerConfig } from "../server/types.js";
import { getExamplesDir } from "../server/ServerManager.js";

const DJANGO_UNFOLD_PORT = 8000;

/**
 * Adapter for Django Unfold example.
 * Single process server-rendered application with Unfold admin theme.
 */
export class DjangoUnfoldAdapter implements FrameworkAdapter {
  readonly type = "django-unfold" as const;
  readonly name = "Django Unfold";
  readonly hasLivePreview = true;
  readonly isSPA = false;

  readonly baseUrl = `http://localhost:${DJANGO_UNFOLD_PORT}`;
  readonly adminUrl = `http://localhost:${DJANGO_UNFOLD_PORT}/admin/`;

  readonly adminCredentials = {
    username: "admin",
    password: "admin",
  };

  getServerConfigs(): ServerConfig[] {
    return [
      {
        name: "django-unfold",
        command: "uv",
        args: [
          "run",
          "python",
          "manage.py",
          "runserver",
          String(DJANGO_UNFOLD_PORT),
        ],
        cwd: path.join(getExamplesDir(), "django-unfold"),
        port: DJANGO_UNFOLD_PORT,
        healthCheckPath: "/",
        healthCheckTimeout: 30000,
      },
    ];
  }

  productListUrl(): string {
    return `${this.baseUrl}/`;
  }

  productDetailUrl(id: number): string {
    return `${this.baseUrl}/product/${id}/`;
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
