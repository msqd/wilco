import type { FrameworkType } from "../server/types.js";
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
 * Get the adapter for a specific framework.
 */
export function getAdapter(type: FrameworkType): FrameworkAdapter {
  switch (type) {
    case "asgi-minimal":
      return new AsgiMinimalAdapter();
    case "django-unfold":
      return new DjangoUnfoldAdapter();
    case "django-vanilla":
      return new DjangoVanillaAdapter();
    case "flask":
      return new FlaskAdapter();
    case "fastapi":
      return new FastAPIAdapter();
    case "starlette":
      return new StarletteAdapter();
    case "wsgi-minimal":
      return new WsgiMinimalAdapter();
    default:
      throw new Error(`Unknown framework type: ${type}`);
  }
}

/**
 * All available adapters.
 */
export const adapters: Record<FrameworkType, FrameworkAdapter> = {
  "asgi-minimal": new AsgiMinimalAdapter(),
  "django-unfold": new DjangoUnfoldAdapter(),
  "django-vanilla": new DjangoVanillaAdapter(),
  flask: new FlaskAdapter(),
  fastapi: new FastAPIAdapter(),
  starlette: new StarletteAdapter(),
  "wsgi-minimal": new WsgiMinimalAdapter(),
};
