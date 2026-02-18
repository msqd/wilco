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

    console.log(`Starting ${config.name}...`);
    console.log(`  Command: ${config.command} ${config.args.join(" ")}`);
    console.log(`  CWD: ${config.cwd}`);

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

    // Log output for debugging
    proc.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        console.log(`  [${config.name}] ${line}`);
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const lines = data.toString().trim().split("\n");
      for (const line of lines) {
        console.log(`  [${config.name}:err] ${line}`);
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
      console.log(`  [${config.name}] Process exited with code ${code}, signal ${signal}`);
      this.servers.delete(config.name);
    });

    // Wait for health check
    const healthUrl = `${baseUrl}${config.healthCheckPath ?? "/"}`;
    const checker = new HealthChecker({
      url: healthUrl,
      timeout: config.healthCheckTimeout ?? 30000,
    });

    console.log(`  Waiting for ${config.name} at ${healthUrl}...`);
    const result = await checker.waitUntilHealthy();

    if (!result.healthy) {
      console.error(`  Failed to start ${config.name}: ${result.error}`);
      await this.stop(config.name);
      throw new Error(`Server ${config.name} failed to start: ${result.error}`);
    }

    console.log(`  ${config.name} is ready (${result.duration}ms)`);
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

    console.log(`Stopping ${name}...`);
    await this.killProcess(server.process);
    this.servers.delete(name);
    console.log(`  ${name} stopped`);
  }

  /**
   * Stop all managed servers.
   */
  async stopAll(): Promise<void> {
    const names = Array.from(this.servers.keys());
    console.log(`Stopping ${names.length} server(s): ${names.join(", ")}`);

    // Stop in parallel
    await Promise.all(names.map((name) => this.stop(name)));
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
