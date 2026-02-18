import path from "node:path";
import type { FrameworkAdapter, PageSelectors } from "./FrameworkAdapter.js";
import type { ServerConfig } from "../server/types.js";
import { getExamplesDir } from "../server/ServerManager.js";

const STARLETTE_PORT = 8400;

/**
 * Adapter for Starlette example.
 * Single process server-rendered application.
 */
export class StarletteAdapter implements FrameworkAdapter {
  readonly type = "starlette" as const;
  readonly name = "Starlette";
  readonly hasLivePreview = true;
  readonly isSPA = false;

  readonly baseUrl = `http://localhost:${STARLETTE_PORT}`;
  readonly adminUrl = `http://localhost:${STARLETTE_PORT}/admin/`;

  readonly adminCredentials = {
    // Starlette-Admin doesn't require auth by default in this example
    username: "",
    password: "",
  };

  getServerConfigs(): ServerConfig[] {
    return [
      {
        name: "starlette",
        command: "uv",
        args: ["run", "uvicorn", "app.main:app", "--reload", "--port", String(STARLETTE_PORT)],
        cwd: path.join(getExamplesDir(), "starlette"),
        port: STARLETTE_PORT,
        healthCheckPath: "/",
        healthCheckTimeout: 30000,
      },
    ];
  }

  productListUrl(): string {
    return `${this.baseUrl}/`;
  }

  productDetailUrl(id: number): string {
    return `${this.baseUrl}/product/${id}`;
  }

  getSelectors(): PageSelectors {
    return {
      // Product list - wilco component renders these (CSS modules classes)
      productGrid: "[data-wilco-component='store:product_list']",
      productCard: "[data-wilco-component='store:product_list'] a[href*='/product/']",
      productCardTitle: "[data-wilco-component='store:product_list'] a[href*='/product/'] h2",
      productCardPrice: "[data-wilco-component='store:product_list'] a[href*='/product/'] h2 + div",
      productCardImage: "[data-wilco-component='store:product_list'] a[href*='/product/'] img",
      productCardLink: "[data-wilco-component='store:product_list'] a[href*='/product/']",

      // Product detail - wilco component renders these
      productTitle: "[data-wilco-component='store:product'] h2",
      productPrice: "[data-wilco-component='store:product'] h2 + div",
      productDescription: "[data-wilco-component='store:product'] p",
      productImage: "[data-wilco-component='store:product'] img",
      backLink: "a.back-link",

      // Admin - Starlette-Admin
      adminLoginForm: "form",
      adminUsernameInput: "input[name='username']",
      adminPasswordInput: "input[name='password']",
      adminLoginButton: "button[type='submit']",
      adminProductList: "table",
      adminProductRow: "tbody tr",
    };
  }
}
