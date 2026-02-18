import { test as setup } from "@playwright/test";
import { WsgiMinimalAdapter, getAdapter } from "../adapters/index.js";
import { getServerManager } from "../server/index.js";

/**
 * Setup for WSGI Minimal tests.
 * Starts the WSGI Minimal server before running tests.
 */
setup("start wsgi-minimal server", async () => {
  console.log("\n=== WSGI Minimal Setup ===\n");

  const adapter = getAdapter("wsgi-minimal") as WsgiMinimalAdapter;
  const manager = getServerManager();

  // Start servers
  const configs = adapter.getServerConfigs();
  for (const config of configs) {
    await manager.start(config);
  }

  console.log("\n=== WSGI Minimal Ready ===\n");
});
