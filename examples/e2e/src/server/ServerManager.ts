import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import type {
  GlobalServerState,
  RunningServer,
  ServerConfig,
} from "./types.js";
import { HealthChecker } from "./HealthChecker.js";

// Global state that persists across test runs
// This is stored in a well-known location for setup/teardown to access
declare const globalThis: {
  __WILCO_E2E_SERVERS__?: GlobalServerState;
};

/**
 * Manages server lifecycle for E2E tests.
 * Handles starting, stopping, and health checking of servers.
 */
export class ServerManager {
  private readonly servers: Map<string, RunningServer>;

  constructor() {
    // Initialize or retrieve global state
    if (!globalThis.__WILCO_E2E_SERVERS__) {
      globalThis.__WILCO_E2E_SERVERS__ = {
        servers: new Map(),
      };
    }
    this.servers = globalThis.__WILCO_E2E_SERVERS__.servers;
  }

  /**
   * Start a server with the given configuration.
   * Waits for health check to pass before returning.
   */
  async start(config: ServerConfig): Promise<RunningServer> {
    // Check if already running
    if (this.servers.has(config.name)) {
      const existing = this.servers.get(config.name)!;
      console.log(`Server ${config.name} already running at ${existing.baseUrl}`);
      return existing;
    }

    const label = `  ${config.name} :${config.port}`;
    process.stdout.write(`${label} ...`);

    // Merge environment variables
    const env = {
      ...process.env,
      ...config.env,
    };

    // Spawn the process
    const proc = spawn(config.command, config.args, {
      cwd: config.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    // Buffer output for error reporting; only log if WILCO_E2E_VERBOSE=1
    const verbose = process.env.WILCO_E2E_VERBOSE === "1";
    const outputBuffer: string[] = [];

    proc.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        outputBuffer.push(`[${config.name}] ${line}`);
        if (outputBuffer.length > 50) outputBuffer.shift();
        if (verbose) {
          console.log(`  [${config.name}] ${line}`);
        }
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        outputBuffer.push(`[${config.name}:err] ${line}`);
        if (outputBuffer.length > 50) outputBuffer.shift();
        if (verbose) {
          console.log(`  [${config.name}:err] ${line}`);
        }
      }
    });

    const baseUrl = `http://localhost:${config.port}`;
    const server: RunningServer = {
      config,
      process: proc,
      baseUrl,
    };

    // Store immediately so we can clean up on failure
    this.servers.set(config.name, server);

    // Handle process exit
    proc.on("exit", (code, signal) => {
      if (verbose) {
        console.log(`  [${config.name}] Process exited with code ${code}, signal ${signal}`);
      }
      this.servers.delete(config.name);
    });

    // Wait for health check
    const healthUrl = `${baseUrl}${config.healthCheckPath ?? "/"}`;
    const checker = new HealthChecker({
      url: healthUrl,
      timeout: config.healthCheckTimeout ?? 30000,
    });

    const result = await checker.waitUntilHealthy();

    if (!result.healthy) {
      process.stdout.write(` \x1b[31m✗\x1b[0m\n`);
      console.error(`    Failed: ${result.error}`);
      if (outputBuffer.length > 0) {
        console.error(`    Last output:`);
        for (const line of outputBuffer.slice(-10)) {
          console.error(`      ${line}`);
        }
      }
      await this.stop(config.name);
      throw new Error(`Server ${config.name} failed to start: ${result.error}`);
    }

    process.stdout.write(` \x1b[32m✓\x1b[0m\n`);
    return server;
  }

  /**
   * Start multiple servers in sequence.
   */
  async startAll(configs: ServerConfig[]): Promise<RunningServer[]> {
    const servers: RunningServer[] = [];
    for (const config of configs) {
      servers.push(await this.start(config));
    }
    return servers;
  }

  /**
   * Stop a specific server by name.
   */
  async stop(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      console.log(`Server ${name} not found`);
      return;
    }

    await this.killProcess(server.process);
    this.servers.delete(name);
  }

  /**
   * Stop all managed servers.
   */
  async stopAll(): Promise<void> {
    const names = Array.from(this.servers.keys());
    process.stdout.write(`Stopping ${names.length} server(s)...`);

    // Stop in parallel
    await Promise.all(names.map((name) => this.stop(name)));
    process.stdout.write(` \x1b[32mdone\x1b[0m\n`);
  }

  /**
   * Get a running server by name.
   */
  get(name: string): RunningServer | undefined {
    return this.servers.get(name);
  }

  /**
   * Get all running servers.
   */
  getAll(): RunningServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Kill a process gracefully, with fallback to SIGKILL.
   */
  private async killProcess(proc: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      // Already dead
      if (proc.exitCode !== null || proc.signalCode !== null) {
        resolve();
        return;
      }

      // Set up timeout for SIGKILL
      const killTimeout = setTimeout(() => {
        console.log("  SIGTERM timeout, sending SIGKILL...");
        proc.kill("SIGKILL");
      }, 5000);

      // Listen for exit
      proc.on("exit", () => {
        clearTimeout(killTimeout);
        resolve();
      });

      // Send SIGTERM
      proc.kill("SIGTERM");
    });
  }
}

/**
 * Get the shared server manager instance.
 */
export function getServerManager(): ServerManager {
  return new ServerManager();
}

/**
 * Get the path to the examples directory.
 */
export function getExamplesDir(): string {
  // This file is at examples/e2e/src/server/ServerManager.ts
  // Examples dir is at examples/
  return path.resolve(import.meta.dirname, "..", "..", "..");
}
