import { defineConfig, devices } from "@playwright/test";
import type { BundleMode } from "./src/server/types.js";

/**
 * Playwright configuration for wilco E2E tests.
 *
 * 14 projects: 7 frameworks x 2 modes (dev + prod).
 * Dev projects use ports 8000-8600, prod projects use ports 9000-9600.
 *
 * Each project can be run independently. The globalSetup/globalTeardown
 * handles starting and stopping the appropriate servers based on
 * the WILCO_E2E_FRAMEWORK and WILCO_E2E_MODE environment variables.
 *
 * Usage:
 *   pnpm test                                   # Run all tests (all modes)
 *   pnpm test:dev                               # Run all tests in dev mode
 *   pnpm test:prod                              # Run all tests in prod mode
 *   pnpm test:django-unfold                     # Run Django Unfold tests (both modes)
 *   pnpm test:django-unfold:dev                 # Run Django Unfold tests (dev only)
 *   pnpm test:django-unfold:prod                # Run Django Unfold tests (prod only)
 */

const FRAMEWORKS = [
  { name: "django-unfold", devPort: 8000, prodPort: 9000 },
  { name: "django-vanilla", devPort: 8100, prodPort: 9100 },
  { name: "flask", devPort: 8200, prodPort: 9200 },
  { name: "fastapi", devPort: 8300, prodPort: 9300 },
  { name: "starlette", devPort: 8400, prodPort: 9400 },
  { name: "asgi-minimal", devPort: 8500, prodPort: 9500 },
  { name: "wsgi-minimal", devPort: 8600, prodPort: 9600 },
] as const;

function makeProject(fw: (typeof FRAMEWORKS)[number], mode: BundleMode) {
  const port = mode === "dev" ? fw.devPort : fw.prodPort;
  return {
    name: `${fw.name}-${mode}`,
    testDir: `./tests/${fw.name}`,
    use: {
      ...devices["Desktop Chrome"],
      baseURL: `http://localhost:${port}`,
    },
  };
}

export default defineConfig({
  // Test directory
  testDir: "./tests",

  // Global setup and teardown
  globalSetup: "./src/fixtures/global.setup.ts",
  globalTeardown: "./src/fixtures/global.teardown.ts",

  // Run tests in files serially within a project (shared server)
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests (servers are shared within project)
  workers: 1,

  // Reporter
  reporter: process.env.CI ? "github" : "list",

  // Shared settings for all projects
  use: {
    // Base URL will be set per-project
    baseURL: "http://localhost:8000",

    // Show browser: set HEADED=1 or use --headed flag
    headless: !process.env.HEADED,

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Timeout for each action
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Projects: 7 frameworks x 2 modes (dev + prod)
  projects: FRAMEWORKS.flatMap((fw) => [
    makeProject(fw, "dev"),
    makeProject(fw, "prod"),
  ]),
});
