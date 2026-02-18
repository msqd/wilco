import { test as teardown } from "@playwright/test";
import { getServerManager } from "../server/index.js";

/**
 * Teardown for ASGI Minimal tests.
 * Stops all ASGI Minimal servers.
 */
teardown("stop asgi-minimal server", async () => {
  console.log("\n=== ASGI Minimal Teardown ===\n");

  const manager = getServerManager();
  await manager.stopAll();

  console.log("\n=== ASGI Minimal Cleanup Complete ===\n");
});
