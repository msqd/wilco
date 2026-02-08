/**
 * Standalone wilco loader for Django integration.
 *
 * This module bundles React and provides a self-contained loader that can
 * render wilco components in any HTML page without requiring a full React app.
 *
 * Usage:
 *   <div data-wilco-component="product_card"
 *        data-wilco-props='{"name": "Widget", "price": "9.99"}'
 *        data-wilco-api="/api"
 *        data-wilco-hash="abc123">
 *   </div>
 *   <script src="/static/wilco/loader.js"></script>
 *
 * The loader will:
 * 1. Find all elements with [data-wilco-component]
 * 2. Fetch the component bundle from the API (with hash for cache busting)
 * 3. Render the component into the container
 */

import * as goober from "goober"
import * as React from "react"
import { createRoot } from "react-dom/client"
import * as ReactJsxRuntime from "react/jsx-runtime"

// Initialize goober with React's createElement
goober.setup(React.createElement)

type LoadedComponent = React.ComponentType<Record<string, unknown>>

// Suspense cache for useComponent hook
// Stores both the promise and resolved value for each component
interface SuspenseEntry {
  promise: Promise<LoadedComponent>
  result?: LoadedComponent
  error?: Error
}
const suspenseCache = new Map<string, SuspenseEntry>()

/**
 * React hook to load a component dynamically with Suspense support.
 *
 * This hook works with React Suspense - it throws a promise while loading,
 * causing React to show the nearest Suspense fallback. Once loaded,
 * subsequent renders return the component synchronously.
 *
 * @param name - Component name (e.g., "store:product")
 * @returns The loaded React component
 *
 * @example
 * ```tsx
 * import { useComponent } from '@wilcojs/react';
 *
 * function ProductPreview(props) {
 *   const Product = useComponent('store:product');
 *   return <Product {...props} mode="detail" />;
 * }
 * ```
 */
function useComponent(name: string): LoadedComponent {
  // Check if we have a cached entry
  let entry = suspenseCache.get(name)

  if (!entry) {
    // Start loading the component
    const promise = loadComponent(name).then(
      (component) => {
        entry!.result = component
        return component
      },
      (error) => {
        entry!.error = error
        throw error
      },
    )
    entry = { promise }
    suspenseCache.set(name, entry)
  }

  // If we have an error, throw it
  if (entry.error) {
    throw entry.error
  }

  // If we have a result, return it
  if (entry.result) {
    return entry.result
  }

  // Otherwise, throw the promise to trigger Suspense
  throw entry.promise
}

// Module registry for bundled components
const moduleRegistry: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": ReactJsxRuntime,
  "@wilcojs/react": { useComponent },
  goober: goober,
}

// Expose globally for component bundles
declare global {
  interface Window {
    __MODULES__: Record<string, unknown>
    wilco: {
      renderComponent: typeof renderComponent
      loadComponent: typeof loadComponent
      updateComponentProps: typeof updateComponentProps
      useComponent: typeof useComponent
    }
  }
}

interface WilcoContainer extends HTMLElement {
  _wilcoRoot?: ReturnType<typeof createRoot>
  _wilcoComponent?: LoadedComponent
  _wilcoProps?: Record<string, unknown>
}

window.__MODULES__ = moduleRegistry

// Promise-based cache for loaded components
// Key format: "componentName" or "componentName?hash" if hash is provided
// Caching the promise (not the result) prevents duplicate fetches for concurrent requests
const componentCache = new Map<string, Promise<LoadedComponent>>()

/**
 * Transform ESM code to work with our runtime module registry.
 * @internal This function is exported for testing purposes only.
 */
function transformEsmToRuntime(code: string, componentName: string): string {
  let transformed = code

  // Extract and preserve the source map comment
  const sourceMapMarker = "//# sourceMappingURL="
  let sourceMapComment = ""
  const sourceMapIndex = transformed.lastIndexOf(sourceMapMarker)
  if (sourceMapIndex !== -1) {
    sourceMapComment = transformed.slice(sourceMapIndex)
    transformed = transformed.slice(0, sourceMapIndex)
  }

  // Transform named imports: import { x, y as z } from "module"
  transformed = transformed.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];?/g,
    (_, imports: string, moduleName: string) => {
      const fixedImports = imports.replace(/(\w+)\s+as\s+(\w+)/g, "$1: $2")
      return `const {${fixedImports}} = window.__MODULES__["${moduleName}"];`
    },
  )

  // Transform default imports: import React from "module"
  transformed = transformed.replace(
    /import\s+(\w+)\s+from\s*["']([^"']+)["'];?/g,
    (_, name: string, moduleName: string) => {
      return `const ${name} = window.__MODULES__["${moduleName}"].default;`
    },
  )

  // Transform namespace imports: import * as React from "module"
  transformed = transformed.replace(
    /import\s*\*\s*as\s+(\w+)\s+from\s*["']([^"']+)["'];?/g,
    (_, name: string, moduleName: string) => {
      return `const ${name} = window.__MODULES__["${moduleName}"];`
    },
  )

  // Extract default export name: export { ..., Foo as default, ... } -> return Foo
  // Use [\s\S] to handle multi-line export statements
  const defaultExportMatch = transformed.match(/export\s*\{[\s\S]*?(\w+)\s+as\s+default[\s\S]*?\};?/)
  if (defaultExportMatch) {
    const exportName = defaultExportMatch[1]
    // Remove all export statements (using [\s\S] for multi-line support)
    transformed = transformed.replace(/export\s*\{[\s\S]*?\};?/g, "")
    transformed += `\nreturn ${exportName};`
  }

  // Add sourceURL for debugging
  transformed += `\n//# sourceURL=components://bundles/${componentName}.js`

  if (sourceMapComment) {
    transformed += `\n${sourceMapComment}`
  }

  return transformed
}

/**
 * Compile component code into a React component.
 */
function compileComponent(code: string, componentName: string): LoadedComponent {
  const transformedCode = transformEsmToRuntime(code, componentName)

  try {
    const moduleFactory = new Function(transformedCode)
    return moduleFactory() as LoadedComponent
  } catch (err) {
    console.error(`Failed to compile component '${componentName}':`, err)
    throw err
  }
}

/**
 * Load a component by name from the API.
 *
 * Uses a promise-based cache to prevent duplicate fetches when multiple
 * containers request the same component simultaneously.
 *
 * @param name - Component name (e.g., "store:product")
 * @param apiBase - Base URL for the API (default: "/api")
 * @param hash - Optional content hash for cache busting
 */
async function loadComponent(name: string, apiBase: string = "/api", hash?: string): Promise<LoadedComponent> {
  // Build cache key - include hash if provided for cache busting
  const cacheKey = hash ? `${name}?${hash}` : name

  // Check if we already have a promise for this component
  const cached = componentCache.get(cacheKey)
  if (cached) return cached

  // Create the fetch promise and cache it immediately
  // This prevents race conditions where multiple concurrent calls start separate fetches
  const fetchPromise = (async () => {
    // Build URL with optional hash query parameter
    const url = hash ? `${apiBase}/bundles/${name}.js?${hash}` : `${apiBase}/bundles/${name}.js`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Component not found: ${name}`)
    }

    const code = await response.text()
    return compileComponent(code, name)
  })()

  componentCache.set(cacheKey, fetchPromise)

  try {
    return await fetchPromise
  } catch (err) {
    // Remove from cache on error so retries can work
    componentCache.delete(cacheKey)
    throw err
  }
}

/**
 * Loading fallback component shown while child components load.
 */
function LoadingFallback() {
  return React.createElement("div", { style: { color: "#666", padding: "1rem", textAlign: "center" } }, "Loading...")
}

/**
 * Wrapper component that provides Suspense boundary for child components.
 * This allows components to use useComponent() for dynamic loading.
 */
function SuspenseWrapper({
  Component,
  props,
}: {
  Component: LoadedComponent
  props: Record<string, unknown>
}) {
  return React.createElement(
    React.Suspense,
    { fallback: React.createElement(LoadingFallback) },
    React.createElement(Component, props),
  )
}

/**
 * Render a component into a container element.
 */
async function renderComponent(
  container: WilcoContainer,
  componentName: string,
  props: Record<string, unknown> = {},
  apiBase: string = "/api",
  hash?: string,
): Promise<void> {
  try {
    const Component = await loadComponent(componentName, apiBase, hash)

    // Reuse existing root if available, otherwise create new one
    let root = container._wilcoRoot
    if (!root) {
      root = createRoot(container)
      container._wilcoRoot = root
    }

    // Wrap in Suspense to support useComponent in child components
    root.render(React.createElement(SuspenseWrapper, { Component, props }))

    // Store references for live updates
    container._wilcoComponent = Component
    container._wilcoProps = props
  } catch (err) {
    console.error(`Failed to render component '${componentName}':`, err)
    const errorDiv = document.createElement("div")
    errorDiv.style.cssText = "color: red; padding: 1rem;"
    errorDiv.textContent = `Failed to load component: ${componentName}`
    container.replaceChildren(errorDiv)
  }
}

/**
 * Update props on an already-rendered component.
 */
function updateComponentProps(container: WilcoContainer, newProps: Record<string, unknown>): boolean {
  const Component = container._wilcoComponent
  const root = container._wilcoRoot

  if (!Component || !root) {
    console.warn("Cannot update props: component not yet loaded")
    return false
  }

  // Use SuspenseWrapper to maintain Suspense support for child components
  root.render(React.createElement(SuspenseWrapper, { Component, props: newProps }))
  container._wilcoProps = newProps
  return true
}

/**
 * Initialize all wilco component containers on the page.
 */
function initializeComponents(): void {
  const containers = document.querySelectorAll<WilcoContainer>("[data-wilco-component]")

  containers.forEach((container) => {
    const componentName = container.dataset.wilcoComponent
    if (!componentName) return

    const propsJson = container.dataset.wilcoProps || "{}"
    const apiBase = container.dataset.wilcoApi || "/api"
    const hash = container.dataset.wilcoHash

    let props: Record<string, unknown> = {}
    try {
      props = JSON.parse(propsJson)
    } catch (err) {
      console.error(`Invalid props JSON for component '${componentName}':`, err)
      const errorDiv = document.createElement("div")
      errorDiv.style.cssText = "color: red; padding: 1rem;"
      errorDiv.textContent = `Invalid props JSON for component: ${componentName}`
      container.replaceChildren(errorDiv)
      return // Don't attempt render with potentially wrong props
    }

    renderComponent(container, componentName, props, apiBase, hash)
  })
}

// Expose API globally (only once)
if (!window.wilco) {
  window.wilco = {
    renderComponent,
    loadComponent,
    updateComponentProps,
    useComponent,
  }

  // Auto-initialize on DOM ready (only once)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeComponents)
  } else {
    initializeComponents()
  }
}

// Public API exports
export { renderComponent, updateComponentProps }

// Internal exports - exposed for testing and advanced use cases
// @internal
export { loadComponent, useComponent, transformEsmToRuntime }
