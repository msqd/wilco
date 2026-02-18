import { test as setup } from "@playwright/test";
import { getServerManager } from "../server/index.js";
import { FastAPIAdapter } from "../adapters/index.js";

/**
 * Setup for FastAPI tests.
 * Starts both the backend API server and the frontend dev server.
 */
setup("start fastapi servers", async () => {
  console.log("\n=== FastAPI Setup ===\n");

  const manager = getServerManager();
  const adapter = new FastAPIAdapter();

  const configs = adapter.getServerConfigs();
  await manager.startAll(configs);

  console.log("\n=== FastAPI Ready ===\n");
});
