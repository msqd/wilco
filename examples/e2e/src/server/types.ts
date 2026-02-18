import type { ChildProcess } from "node:child_process";

/**
 * Configuration for a server to start.
 */
export interface ServerConfig {
  /** Unique identifier for this server */
  name: string;
  /** Command to run (e.g., "uv run python manage.py runserver") */
  command: string;
  /** Arguments to pass to the command */
  args: string[];
  /** Working directory for the process */
  cwd: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Port the server listens on */
  port: number;
  /** URL path for health check (default: "/") */
  healthCheckPath?: string;
  /** Timeout for health check in milliseconds (default: 30000) */
  healthCheckTimeout?: number;
}

/**
 * Running server instance.
 */
export interface RunningServer {
  /** Server configuration */
  config: ServerConfig;
  /** Child process handle */
  process: ChildProcess;
  /** Base URL for the server */
  baseUrl: string;
}

/**
 * Result of a health check.
 */
export interface HealthCheckResult {
  /** Whether the server is healthy */
  healthy: boolean;
  /** Status code if available */
  statusCode?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Duration of the check in milliseconds */
  duration: number;
}

/**
 * Global state for server management across setup/teardown.
 */
export interface GlobalServerState {
  servers: Map<string, RunningServer>;
}

/**
 * Framework type identifier.
 */
export type FrameworkType =
  | "asgi-minimal"
  | "django-unfold"
  | "django-vanilla"
  | "flask"
  | "fastapi"
  | "starlette"
  | "wsgi-minimal";
