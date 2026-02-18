import { test as teardown } from "@playwright/test";
import { getServerManager } from "../server/index.js";

/**
 * Teardown for WSGI Minimal tests.
 * Stops all WSGI Minimal servers.
 */
teardown("stop wsgi-minimal server", async () => {
  console.log("\n=== WSGI Minimal Teardown ===\n");

  const manager = getServerManager();
  await manager.stopAll();

  console.log("\n=== WSGI Minimal Cleanup Complete ===\n");
});
