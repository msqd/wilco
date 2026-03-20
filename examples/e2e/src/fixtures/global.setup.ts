import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { getServerManager } from "../server/index.js";
import { getAdapter } from "../adapters/index.js";
import type { FrameworkType, BundleMode } from "../server/types.js";

const execAsync = promisify(exec);

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
 * Determine which modes to run from WILCO_E2E_MODE env var.
 * Possible values: "dev", "prod", "all" (default: "all").
 */
function getModesToRun(): BundleMode[] {
  const modeEnv = process.env.WILCO_E2E_MODE ?? "all";
  if (modeEnv === "dev") return ["dev"];
  if (modeEnv === "prod") return ["prod"];
  return ["dev", "prod"];
}

/**
 * Run setup for an example (install dependencies, migrate, load fixtures).
 */
async function runSetup(framework: FrameworkType): Promise<void> {
  const exampleDir = path.join(EXAMPLES_DIR, framework);

  if (!fs.existsSync(exampleDir)) {
    console.log(`  Skipping setup for ${framework} (directory not found)`);
    return;
  }

  console.log(`  Setting up ${framework}...`);

  try {
    await execAsync("make setup", {
      cwd: exampleDir,
      timeout: 120000, // 2 minutes
    });
    console.log(`  ${framework} setup complete`);
  } catch (error) {
    // Log but don't fail - the server might still work if already set up
    console.log(`  ${framework} setup warning: ${(error as Error).message}`);
  }
}

/**
 * Run build for an example (pre-build assets for prod mode).
 */
async function runBuild(framework: FrameworkType): Promise<void> {
  const exampleDir = path.join(EXAMPLES_DIR, framework);

  if (!fs.existsSync(exampleDir)) {
    console.log(`  Skipping build for ${framework} (directory not found)`);
    return;
  }

  console.log(`  Building ${framework}...`);

  try {
    await execAsync("make build", {
      cwd: exampleDir,
      timeout: 120000, // 2 minutes
    });
    console.log(`  ${framework} build complete`);
  } catch (error) {
    console.log(`  ${framework} build warning: ${(error as Error).message}`);
  }
}

/**
 * Global setup for E2E tests.
 * Reads WILCO_E2E_FRAMEWORK env var to determine which framework to start.
 * Reads WILCO_E2E_MODE env var to determine which modes to run ("dev", "prod", or "all").
 */
async function globalSetup(): Promise<void> {
  // Get framework from environment or default to all
  const frameworkEnv = process.env.WILCO_E2E_FRAMEWORK as FrameworkType | "all" | undefined;
  const frameworks: FrameworkType[] =
    frameworkEnv && frameworkEnv !== "all"
      ? [frameworkEnv]
      : ALL_FRAMEWORKS;

  const modes = getModesToRun();

  console.log(`\n=== E2E Global Setup ===`);
  console.log(`Frameworks: ${frameworks.join(", ")}`);
  console.log(`Modes: ${modes.join(", ")}\n`);

  // Run setup for each example in parallel
  console.log("Running setup for examples...\n");
  await Promise.all(frameworks.map((fw) => runSetup(fw)));
  console.log("");

  // Run build for prod mode in parallel
  if (modes.includes("prod")) {
    console.log("Running build for prod mode...\n");
    await Promise.all(frameworks.map((fw) => runBuild(fw)));
    console.log("");
  }

  // Start servers for all framework + mode combinations
  const manager = getServerManager();
  const serverNames: string[] = [];

  for (const framework of frameworks) {
    for (const mode of modes) {
      const adapter = getAdapter(framework, mode);
      const configs = adapter.getServerConfigs();

      for (const config of configs) {
        await manager.start(config);
        serverNames.push(config.name);
      }
    }
  }

  // Write state for teardown
  fs.writeFileSync(STATE_FILE, JSON.stringify({ serverNames }));

  console.log(`\n=== Setup Complete ===\n`);
}

export default globalSetup;
