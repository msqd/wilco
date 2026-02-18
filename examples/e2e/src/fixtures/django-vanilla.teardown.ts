import { test as teardown } from "@playwright/test";
import { getServerManager } from "../server/index.js";

/**
 * Teardown for Django Vanilla tests.
 * Stops all Django Vanilla servers.
 */
teardown("stop django-vanilla server", async () => {
  console.log("\n=== Django Vanilla Teardown ===\n");

  const manager = getServerManager();
  await manager.stopAll();

  console.log("\n=== Django Vanilla Cleanup Complete ===\n");
});
