import type { FrameworkType, BundleMode } from "../server/types.js";
import type { FrameworkAdapter } from "./FrameworkAdapter.js";
import { AsgiMinimalAdapter } from "./AsgiMinimalAdapter.js";
import { DjangoUnfoldAdapter } from "./DjangoUnfoldAdapter.js";
import { DjangoVanillaAdapter } from "./DjangoVanillaAdapter.js";
import { FastAPIAdapter } from "./FastAPIAdapter.js";
import { FlaskAdapter } from "./FlaskAdapter.js";
import { StarletteAdapter } from "./StarletteAdapter.js";
import { WsgiMinimalAdapter } from "./WsgiMinimalAdapter.js";

export type { FrameworkAdapter, PageSelectors } from "./FrameworkAdapter.js";
export { AsgiMinimalAdapter } from "./AsgiMinimalAdapter.js";
export { DjangoUnfoldAdapter } from "./DjangoUnfoldAdapter.js";
export { DjangoVanillaAdapter } from "./DjangoVanillaAdapter.js";
export { FastAPIAdapter } from "./FastAPIAdapter.js";
export { FlaskAdapter } from "./FlaskAdapter.js";
export { StarletteAdapter } from "./StarletteAdapter.js";
export { WsgiMinimalAdapter } from "./WsgiMinimalAdapter.js";

/**
 * Default ports for each framework in dev and prod modes.
 */
const DEFAULT_PORTS: Record<FrameworkType, { dev: number; prod: number }> = {
  "django-unfold": { dev: 8000, prod: 9000 },
  "django-vanilla": { dev: 8100, prod: 9100 },
  flask: { dev: 8200, prod: 9200 },
  fastapi: { dev: 8301, prod: 9301 },
  starlette: { dev: 8400, prod: 9400 },
  "asgi-minimal": { dev: 8500, prod: 9500 },
  "wsgi-minimal": { dev: 8600, prod: 9600 },
};

/**
 * Get the adapter for a specific framework, mode, and optional port override.
 */
export function getAdapter(
  type: FrameworkType,
  mode: BundleMode = "dev",
  port?: number,
): FrameworkAdapter {
  const resolvedPort = port ?? DEFAULT_PORTS[type][mode];

  switch (type) {
    case "asgi-minimal":
      return new AsgiMinimalAdapter(resolvedPort, mode);
    case "django-unfold":
      return new DjangoUnfoldAdapter(resolvedPort, mode);
    case "django-vanilla":
      return new DjangoVanillaAdapter(resolvedPort, mode);
    case "flask":
      return new FlaskAdapter(resolvedPort, mode);
    case "fastapi":
      return new FastAPIAdapter(resolvedPort, mode);
    case "starlette":
      return new StarletteAdapter(resolvedPort, mode);
    case "wsgi-minimal":
      return new WsgiMinimalAdapter(resolvedPort, mode);
    default:
      throw new Error(`Unknown framework type: ${type}`);
  }
}
