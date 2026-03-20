import path from "node:path";
import type { FrameworkAdapter, PageSelectors } from "./FrameworkAdapter.js";
import type { ServerConfig, BundleMode } from "../server/types.js";
import { getExamplesDir } from "../server/ServerManager.js";

/**
 * Adapter for FastAPI example.
 * Two process setup: backend API + React SPA frontend.
 *
 * Port convention: `port` is the base port (backend = port, frontend = port - 1).
 * Default: backend = 8301, frontend = 8300.
 */
export class FastAPIAdapter implements FrameworkAdapter {
  readonly type = "fastapi" as const;
  readonly name = "FastAPI";
  readonly hasLivePreview = false;
  readonly isSPA = true;
  readonly mode: BundleMode;

  private readonly backendPort: number;
  private readonly frontendPort: number;

  readonly adminCredentials = {
    // SQLAdmin doesn't require auth by default in this example
    username: "",
    password: "",
  };

  constructor(port = 8301, mode: BundleMode = "dev") {
    this.backendPort = port;
    this.frontendPort = port - 1;
    this.mode = mode;
  }

  // Frontend URL is the main entry point
  get baseUrl(): string {
    return `http://localhost:${this.frontendPort}`;
  }

  // Admin is served by the backend but proxied through frontend
  get adminUrl(): string {
    return `http://localhost:${this.frontendPort}/admin/`;
  }

  getServerConfigs(): ServerConfig[] {
    const exampleDir = path.join(getExamplesDir(), "fastapi");
    const backendEnv: Record<string, string> = {};

    if (this.mode === "prod") {
      backendEnv.WILCO_BUILD_DIR = path.join(exampleDir, "dist", "wilco");
    }

    return [
      {
        name: `fastapi-backend-${this.mode}`,
        command: "uv",
        args: ["run", "uvicorn", "app.main:app", "--reload", "--port", String(this.backendPort)],
        cwd: exampleDir,
        port: this.backendPort,
        healthCheckPath: "/api/products",
        healthCheckTimeout: 30000,
        ...(Object.keys(backendEnv).length > 0 ? { env: backendEnv } : {}),
      },
      {
        name: `fastapi-frontend-${this.mode}`,
        command: "pnpm",
        args: ["dev"],
        cwd: path.join(exampleDir, "frontend"),
        port: this.frontendPort,
        env: {
          VITE_PORT: String(this.frontendPort),
          VITE_API_PORT: String(this.backendPort),
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
