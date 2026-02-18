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
  console.log(`\n=== E2E Global Teardown ===\n`);

  const manager = getServerManager();

  // Read state if available
  if (fs.existsSync(STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      console.log(`Stopping servers: ${state.serverNames?.join(", ") || "all"}`);
    } catch {
      // Ignore errors reading state
    }
    fs.unlinkSync(STATE_FILE);
  }

  await manager.stopAll();

  console.log(`\n=== Teardown Complete ===\n`);
}

export default globalTeardown;
