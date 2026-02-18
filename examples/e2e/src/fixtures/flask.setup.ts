import { test as setup } from "@playwright/test";
import { getServerManager } from "../server/index.js";
import { FlaskAdapter } from "../adapters/index.js";

/**
 * Setup for Flask tests.
 * Starts the Flask development server.
 */
setup("start flask server", async () => {
  console.log("\n=== Flask Setup ===\n");

  const manager = getServerManager();
  const adapter = new FlaskAdapter();

  const configs = adapter.getServerConfigs();
  await manager.startAll(configs);

  console.log("\n=== Flask Ready ===\n");
});
