import { test as teardown } from "@playwright/test";
import { getServerManager } from "../server/index.js";

/**
 * Teardown for Django Unfold tests.
 * Stops all Django Unfold servers.
 */
teardown("stop django-unfold server", async () => {
  console.log("\n=== Django Unfold Teardown ===\n");

  const manager = getServerManager();
  await manager.stopAll();

  console.log("\n=== Django Unfold Cleanup Complete ===\n");
});
