import path from "node:path";
import type { FrameworkAdapter, PageSelectors } from "./FrameworkAdapter.js";
import type { ServerConfig } from "../server/types.js";
import { getExamplesDir } from "../server/ServerManager.js";

const FLASK_PORT = 8200;

/**
 * Adapter for Flask example.
 * Single process server-rendered application with Flask-Admin.
 */
export class FlaskAdapter implements FrameworkAdapter {
  readonly type = "flask" as const;
  readonly name = "Flask";
  readonly hasLivePreview = true;
  readonly isSPA = false;

  readonly baseUrl = `http://localhost:${FLASK_PORT}`;
  readonly adminUrl = `http://localhost:${FLASK_PORT}/admin/`;

  // Flask-Admin doesn't use standard login credentials
  readonly adminCredentials = undefined;

  getServerConfigs(): ServerConfig[] {
    return [
      {
        name: "flask",
        command: "uv",
        args: [
          "run",
          "flask",
          "--app",
          "app.main:create_app",
          "run",
          "--port",
          String(FLASK_PORT),
        ],
        cwd: path.join(getExamplesDir(), "flask"),
        port: FLASK_PORT,
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

      // Admin - Flask-Admin (Bootstrap 4 theme)
      adminLoginForm: "form",
      adminUsernameInput: "input[name='username']",
      adminPasswordInput: "input[name='password']",
      adminLoginButton: "button[type='submit'], input[type='submit']",
      adminProductList: "table.model-list",
      adminProductRow: "table.model-list tbody tr",
    };
  }
}
