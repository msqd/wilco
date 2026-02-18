import { test as teardown } from "@playwright/test";
import { getServerManager } from "../server/index.js";

/**
 * Teardown for FastAPI tests.
 * Stops both the backend API server and the frontend dev server.
 */
teardown("stop fastapi servers", async () => {
  console.log("\n=== FastAPI Teardown ===\n");

  const manager = getServerManager();
  await manager.stopAll();

  console.log("\n=== FastAPI Cleanup Complete ===\n");
});
