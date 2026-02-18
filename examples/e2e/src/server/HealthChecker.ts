import type { HealthCheckResult } from "./types.js";

/**
 * HTTP health checker that polls an endpoint until it's available.
 */
export class HealthChecker {
  private readonly url: string;
  private readonly timeout: number;
  private readonly pollInterval: number;

  constructor(options: {
    url: string;
    timeout?: number;
    pollInterval?: number;
  }) {
    this.url = options.url;
    this.timeout = options.timeout ?? 30000;
    this.pollInterval = options.pollInterval ?? 500;
  }

  /**
   * Check health once without retrying.
   */
  async checkOnce(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.url, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - start;

      // Accept 2xx, 3xx, and 4xx as "server is running"
      // 4xx means the server is up but maybe the path doesn't exist
      const healthy = response.status < 500;

      return {
        healthy,
        statusCode: response.status,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - start;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        healthy: false,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Wait for the server to become healthy.
   * Polls the endpoint until a successful response or timeout.
   */
  async waitUntilHealthy(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.timeout) {
      const result = await this.checkOnce();

      if (result.healthy) {
        return result;
      }

      // Wait before next poll
      await this.sleep(this.pollInterval);
    }

    // Final attempt after timeout
    const finalResult = await this.checkOnce();
    if (finalResult.healthy) {
      return finalResult;
    }

    return {
      healthy: false,
      error: `Timeout after ${this.timeout}ms waiting for ${this.url}`,
      duration: Date.now() - startTime,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
