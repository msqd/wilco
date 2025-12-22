import * as React from "react";
import * as ReactJsxRuntime from "react/jsx-runtime";
import { useComponent } from "./useComponent.ts";
import * as wilco from "./wilco.ts";

interface ServerComponentProps {
  name: string;
  props?: Record<string, unknown>;
}

// Expose modules globally for dynamic imports in bundled components
declare global {
  interface Window {
    __MODULES__: Record<string, unknown>;
  }
}

window.__MODULES__ = {
  react: React,
  "react/jsx-runtime": ReactJsxRuntime,
  "@wilcojs/react": wilco,
};

/**
 * Render a server component by name.
 * Must be wrapped in a Suspense boundary.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<Loading />}>
 *   <ServerComponent name="example.counter" props={{ initialValue: 10 }} />
 * </Suspense>
 * ```
 */
export function ServerComponent({ name, props = {} }: ServerComponentProps) {
  const Component = useComponent(name);
  return <Component {...props} />;
}
