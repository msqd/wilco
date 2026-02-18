import { test as setup } from "@playwright/test";
import { getServerManager } from "../server/index.js";
import { DjangoUnfoldAdapter } from "../adapters/index.js";

/**
 * Setup for Django Unfold tests.
 * Starts the Django development server with Unfold admin.
 */
setup("start django-unfold server", async () => {
  console.log("\n=== Django Unfold Setup ===\n");

  const manager = getServerManager();
  const adapter = new DjangoUnfoldAdapter();

  const configs = adapter.getServerConfigs();
  await manager.startAll(configs);

  console.log("\n=== Django Unfold Ready ===\n");
});
