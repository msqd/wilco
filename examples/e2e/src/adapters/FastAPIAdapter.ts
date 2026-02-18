import path from "node:path";
import type { FrameworkAdapter, PageSelectors } from "./FrameworkAdapter.js";
import type { ServerConfig } from "../server/types.js";
import { getExamplesDir } from "../server/ServerManager.js";

const FASTAPI_FRONTEND_PORT = 8300; // Main port - Vite proxies to backend
const FASTAPI_BACKEND_PORT = 8301;  // API port

/**
 * Adapter for FastAPI example.
 * Two process setup: backend API + React SPA frontend.
 */
export class FastAPIAdapter implements FrameworkAdapter {
  readonly type = "fastapi" as const;
  readonly name = "FastAPI";
  readonly hasLivePreview = false;
  readonly isSPA = true;

  // Frontend URL is the main entry point
  readonly baseUrl = `http://localhost:${FASTAPI_FRONTEND_PORT}`;
  // Admin is served by the backend but proxied through frontend
  readonly adminUrl = `http://localhost:${FASTAPI_FRONTEND_PORT}/admin/`;

  readonly adminCredentials = {
    // SQLAdmin doesn't require auth by default in this example
    username: "",
    password: "",
  };

  getServerConfigs(): ServerConfig[] {
    return [
      {
        name: "fastapi-backend",
        command: "uv",
        args: ["run", "uvicorn", "app.main:app", "--reload", "--port", String(FASTAPI_BACKEND_PORT)],
        cwd: path.join(getExamplesDir(), "fastapi"),
        port: FASTAPI_BACKEND_PORT,
        healthCheckPath: "/api/products",
        healthCheckTimeout: 30000,
      },
      {
        name: "fastapi-frontend",
        command: "pnpm",
        args: ["dev"],
        cwd: path.join(getExamplesDir(), "fastapi", "frontend"),
        port: FASTAPI_FRONTEND_PORT,
        env: {
          VITE_PORT: String(FASTAPI_FRONTEND_PORT),
          VITE_API_PORT: String(FASTAPI_BACKEND_PORT),
        },
        healthCheckPath: "/",
        healthCheckTimeout: 60000, // Vite can be slow to start
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
      // Product list - React/Tailwind components
      productGrid: ".grid",
      productCard: ".bg-white.rounded-lg",
      productCardTitle: ".bg-white.rounded-lg h3",
      productCardPrice: ".bg-white.rounded-lg p.text-green-600",
      productCardImage: ".bg-white.rounded-lg img",
      productCardLink: "a[href^='/product/']",

      // Product detail - React components
      productTitle: "h2.text-2xl",
      productPrice: "p.text-3xl.text-green-600",
      productDescription: "p.text-gray-600",
      productImage: "img",
      backLink: "a[href='/']:has-text('Back to Products')",

      // Admin - SQLAdmin
      adminLoginForm: "form",
      adminUsernameInput: "input[name='username']",
      adminPasswordInput: "input[name='password']",
      adminLoginButton: "button[type='submit']",
      adminProductList: "table",
      adminProductRow: "tbody tr",
    };
  }
}
