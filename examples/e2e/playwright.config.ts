import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for wilco E2E tests.
 *
 * Seven projects for Django Unfold, Django Vanilla, Flask, FastAPI, Starlette, ASGI Minimal, and WSGI Minimal.
 *
 * Each project can be run independently. The globalSetup/globalTeardown
 * handles starting and stopping the appropriate servers based on
 * the WILCO_E2E_FRAMEWORK environment variable.
 *
 * Usage:
 *   pnpm test                                   # Run all tests (starts all servers)
 *   pnpm test:django-unfold                     # Run Django Unfold tests only
 *   pnpm test:django-vanilla                    # Run Django Vanilla tests only
 *   pnpm test:flask                             # Run Flask tests only
 *   pnpm test:asgi-minimal                      # Run ASGI Minimal tests only
 *   pnpm test:wsgi-minimal                      # Run WSGI Minimal tests only
 *   WILCO_E2E_FRAMEWORK=django-unfold pnpm test # Same as above
 */
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

  // Projects for each framework (ports in 100 increments)
  projects: [
    {
      name: "django-unfold",
      testDir: "./tests/django-unfold",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:8000",
      },
    },
    {
      name: "django-vanilla",
      testDir: "./tests/django-vanilla",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:8100",
      },
    },
    {
      name: "flask",
      testDir: "./tests/flask",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:8200",
      },
    },
    {
      name: "fastapi",
      testDir: "./tests/fastapi",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:8300",
      },
    },
    {
      name: "starlette",
      testDir: "./tests/starlette",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:8400",
      },
    },
    {
      name: "asgi-minimal",
      testDir: "./tests/asgi-minimal",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:8500",
      },
    },
    {
      name: "wsgi-minimal",
      testDir: "./tests/wsgi-minimal",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:8600",
      },
    },
  ],
});
