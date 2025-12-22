/**
 * Standalone wilco loader for Django integration.
 *
 * This module bundles React and provides a self-contained loader that can
 * render wilco components in any HTML page without requiring a full React app.
 *
 * Usage:
 *   <div data-wilco-component="product_card"
 *        data-wilco-props='{"name": "Widget", "price": "9.99"}'
 *        data-wilco-api="/api">
 *   </div>
 *   <script src="/static/wilco/loader.js"></script>
 *
 * The loader will:
 * 1. Find all elements with [data-wilco-component]
 * 2. Fetch the component bundle from the API
 * 3. Render the component into the container
 */

import * as React from "react";
import { createRoot } from "react-dom/client";
import * as ReactJsxRuntime from "react/jsx-runtime";

type LoadedComponent = React.ComponentType<Record<string, unknown>>;

// Module registry for bundled components
const moduleRegistry: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": ReactJsxRuntime,
};

// Expose globally for component bundles
declare global {
  interface Window {
    __MODULES__: Record<string, unknown>;
    wilco: {
      renderComponent: typeof renderComponent;
      loadComponent: typeof loadComponent;
    };
  }
}

window.__MODULES__ = moduleRegistry;

// Cache for loaded components
const componentCache = new Map<string, LoadedComponent>();

/**
 * Transform ESM code to work with our runtime module registry.
 */
function transformEsmToRuntime(code: string, componentName: string): string {
  let transformed = code;

  // Extract and preserve the source map comment
  const sourceMapMarker = "//# sourceMappingURL=";
  let sourceMapComment = "";
  const sourceMapIndex = transformed.lastIndexOf(sourceMapMarker);
  if (sourceMapIndex !== -1) {
    sourceMapComment = transformed.slice(sourceMapIndex);
    transformed = transformed.slice(0, sourceMapIndex);
  }

  // Transform imports: import { x } from "react" -> const { x } = window.__MODULES__["react"]
  transformed = transformed.replace(
    /import\s+(\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s*["']([^"']+)["'];?/g,
    (_, imports, moduleName) => {
      const fixedImports = imports.replace(/(\w+)\s+as\s+(\w+)/g, "$1: $2");
      return `const ${fixedImports} = window.__MODULES__["${moduleName}"];`;
    }
  );

  // Extract default export name: export { Foo as default } -> return Foo
  const defaultExportMatch = transformed.match(
    /export\s*\{\s*(\w+)\s+as\s+default\s*\};?/
  );
  if (defaultExportMatch) {
    const exportName = defaultExportMatch[1];
    transformed = transformed.replace(/export\s*\{[^}]*\};?/g, "");
    transformed += `\nreturn ${exportName};`;
  }

  // Add sourceURL for debugging
  transformed += `\n//# sourceURL=components://bundles/${componentName}.js`;

  if (sourceMapComment) {
    transformed += `\n${sourceMapComment}`;
  }

  return transformed;
}

/**
 * Compile component code into a React component.
 */
function compileComponent(code: string, componentName: string): LoadedComponent {
  const transformedCode = transformEsmToRuntime(code, componentName);

  try {
    const moduleFactory = new Function(transformedCode);
    return moduleFactory() as LoadedComponent;
  } catch (err) {
    console.error(`Failed to compile component '${componentName}':`, err);
    throw err;
  }
}

/**
 * Load a component by name from the API.
 */
async function loadComponent(
  name: string,
  apiBase: string = "/api"
): Promise<LoadedComponent> {
  const cached = componentCache.get(name);
  if (cached) return cached;

  const response = await fetch(`${apiBase}/bundles/${name}.js`);
  if (!response.ok) {
    throw new Error(`Component not found: ${name}`);
  }

  const code = await response.text();
  const Component = compileComponent(code, name);
  componentCache.set(name, Component);

  return Component;
}

/**
 * Render a component into a container element.
 */
async function renderComponent(
  container: HTMLElement,
  componentName: string,
  props: Record<string, unknown> = {},
  apiBase: string = "/api"
): Promise<void> {
  try {
    const Component = await loadComponent(componentName, apiBase);
    const root = createRoot(container);
    root.render(React.createElement(Component, props));
  } catch (err) {
    console.error(`Failed to render component '${componentName}':`, err);
    container.innerHTML = `<div style="color: red; padding: 1rem;">
      Failed to load component: ${componentName}
    </div>`;
  }
}

/**
 * Initialize all wilco component containers on the page.
 */
function initializeComponents(): void {
  const containers = document.querySelectorAll<HTMLElement>(
    "[data-wilco-component]"
  );

  containers.forEach((container) => {
    const componentName = container.dataset.wilcoComponent;
    if (!componentName) return;

    const propsJson = container.dataset.wilcoProps || "{}";
    const apiBase = container.dataset.wilcoApi || "/api";

    let props: Record<string, unknown> = {};
    try {
      props = JSON.parse(propsJson);
    } catch (err) {
      console.error(`Invalid props JSON for component '${componentName}':`, err);
    }

    renderComponent(container, componentName, props, apiBase);
  });
}

// Expose API globally
window.wilco = {
  renderComponent,
  loadComponent,
};

// Auto-initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeComponents);
} else {
  initializeComponents();
}

export { loadComponent, renderComponent, transformEsmToRuntime };
