import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getServerManager } from "../server/index.js";
import { getAdapter } from "../adapters/index.js";
import type { FrameworkType } from "../server/types.js";

// State file to store running server info for teardown
const STATE_FILE = path.join(import.meta.dirname, "..", "..", ".server-state.json");

// Examples directory
const EXAMPLES_DIR = path.join(import.meta.dirname, "..", "..", "..");

// All available frameworks
const ALL_FRAMEWORKS: FrameworkType[] = [
  "django-unfold",
  "django-vanilla",
  "flask",
  "fastapi",
  "starlette",
  "asgi-minimal",
  "wsgi-minimal",
];

/**
 * Run setup for an example (install dependencies, migrate, load fixtures).
 */
function runSetup(framework: FrameworkType): void {
  // Map framework to directory (most are 1:1, fastapi is special)
  const exampleDir = path.join(EXAMPLES_DIR, framework);

  if (!fs.existsSync(exampleDir)) {
    console.log(`  Skipping setup for ${framework} (directory not found)`);
    return;
  }

  console.log(`  Setting up ${framework}...`);

  try {
    // Run make setup with a timeout
    execSync("make setup", {
      cwd: exampleDir,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120000, // 2 minutes
    });
    console.log(`  ${framework} setup complete`);
  } catch (error) {
    // Log but don't fail - the server might still work if already set up
    console.log(`  ${framework} setup warning: ${(error as Error).message}`);
  }
}

/**
 * Global setup for E2E tests.
 * Reads WILCO_E2E_FRAMEWORK env var to determine which framework to start.
 */
async function globalSetup(): Promise<void> {
  // Get framework from environment or default to all
  const frameworkEnv = process.env.WILCO_E2E_FRAMEWORK as FrameworkType | "all" | undefined;
  const frameworks: FrameworkType[] =
    frameworkEnv && frameworkEnv !== "all"
      ? [frameworkEnv]
      : ALL_FRAMEWORKS;

  console.log(`\n=== E2E Global Setup ===`);
  console.log(`Frameworks: ${frameworks.join(", ")}\n`);

  // Run setup for each example first
  console.log("Running setup for examples...\n");
  for (const framework of frameworks) {
    runSetup(framework);
  }
  console.log("");

  // Start servers
  const manager = getServerManager();
  const serverNames: string[] = [];

  for (const framework of frameworks) {
    const adapter = getAdapter(framework);
    const configs = adapter.getServerConfigs();

    for (const config of configs) {
      await manager.start(config);
      serverNames.push(config.name);
    }
  }

  // Write state for teardown
  fs.writeFileSync(STATE_FILE, JSON.stringify({ serverNames }));

  console.log(`\n=== Setup Complete ===\n`);
}

export default globalSetup;
