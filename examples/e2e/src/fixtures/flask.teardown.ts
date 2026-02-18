import { test as teardown } from "@playwright/test";
import { getServerManager } from "../server/index.js";

/**
 * Teardown for Flask tests.
 * Stops all Flask servers.
 */
teardown("stop flask server", async () => {
  console.log("\n=== Flask Teardown ===\n");

  const manager = getServerManager();
  await manager.stopAll();

  console.log("\n=== Flask Cleanup Complete ===\n");
});
