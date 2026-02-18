import { test as setup } from "@playwright/test";
import { getServerManager } from "../server/index.js";
import { StarletteAdapter } from "../adapters/index.js";

/**
 * Setup for Starlette tests.
 * Starts the Starlette development server.
 */
setup("start starlette server", async () => {
  console.log("\n=== Starlette Setup ===\n");

  const manager = getServerManager();
  const adapter = new StarletteAdapter();

  const configs = adapter.getServerConfigs();
  await manager.startAll(configs);

  console.log("\n=== Starlette Ready ===\n");
});
