import fs from "node:fs";
import path from "node:path";
import { getServerManager } from "../server/index.js";

// State file to read running server info
const STATE_FILE = path.join(import.meta.dirname, "..", "..", ".server-state.json");

/**
 * Global teardown for E2E tests.
 * Stops all servers that were started in setup.
 */
async function globalTeardown(): Promise<void> {
  console.log(`\n=== Teardown ===`);

  const manager = getServerManager();

  if (fs.existsSync(STATE_FILE)) {
    try {
      fs.unlinkSync(STATE_FILE);
    } catch {
      // Ignore
    }
  }

  await manager.stopAll();
}

export default globalTeardown;
