import { test as setup } from "@playwright/test";
import { getServerManager } from "../server/index.js";
import { DjangoVanillaAdapter } from "../adapters/index.js";

/**
 * Setup for Django Vanilla tests.
 * Starts the Django development server with standard admin.
 */
setup("start django-vanilla server", async () => {
  console.log("\n=== Django Vanilla Setup ===\n");

  const manager = getServerManager();
  const adapter = new DjangoVanillaAdapter();

  const configs = adapter.getServerConfigs();
  await manager.startAll(configs);

  console.log("\n=== Django Vanilla Ready ===\n");
});
