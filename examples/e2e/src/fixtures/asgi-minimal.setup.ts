import { test as setup } from "@playwright/test";
import { AsgiMinimalAdapter, getAdapter } from "../adapters/index.js";
import { getServerManager } from "../server/index.js";

/**
 * Setup for ASGI Minimal tests.
 * Starts the ASGI Minimal server before running tests.
 */
setup("start asgi-minimal server", async () => {
  console.log("\n=== ASGI Minimal Setup ===\n");

  const adapter = getAdapter("asgi-minimal") as AsgiMinimalAdapter;
  const manager = getServerManager();

  // Start servers
  const configs = adapter.getServerConfigs();
  for (const config of configs) {
    await manager.start(config);
  }

  console.log("\n=== ASGI Minimal Ready ===\n");
});
