import { test as teardown } from "@playwright/test";
import { getServerManager } from "../server/index.js";

/**
 * Teardown for Starlette tests.
 * Stops all Starlette servers.
 */
teardown("stop starlette server", async () => {
  console.log("\n=== Starlette Teardown ===\n");

  const manager = getServerManager();
  await manager.stopAll();

  console.log("\n=== Starlette Cleanup Complete ===\n");
});
