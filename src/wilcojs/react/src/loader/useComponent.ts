import { useMemo, type ComponentType } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { registerSourceMap } from "./sourceMapRegistry.ts"
import { transformImports, importFromString } from "./esm.ts"
import { ComponentNotFoundError, ExportNotFoundError, InvalidComponentNameError } from "./errors.ts"

/**
 * Validate component name at API boundary.
 * Throws InvalidComponentNameError for invalid names.
 */
function validateComponentName(name: unknown): asserts name is string {
  if (!name || typeof name !== "string") {
    throw new InvalidComponentNameError(name, "must be a non-empty string")
  }
  if (name.includes("..") || name.includes("/")) {
    throw new InvalidComponentNameError(name, "cannot contain path traversal characters")
  }
}

type LoadedComponent = ComponentType<Record<string, unknown>>

// Cache for compiled modules (code -> module exports)
const moduleCache = new Map<string, Record<string, unknown>>()

async function fetchBundleCode(name: string): Promise<string> {
  const response = await fetch(`/api/bundles/${name}.js`)
  if (!response.ok) {
    throw new ComponentNotFoundError(name)
  }
  return response.text()
}

/**
 * Load an ESM module from code, using native browser import().
 * Caches the module to avoid re-importing the same code.
 */
async function loadModule(
  code: string,
  componentName: string
): Promise<Record<string, unknown>> {
  // Check cache first
  const cached = moduleCache.get(code)
  if (cached) {
    return cached
  }

  // Register source map before importing
  registerSourceMap(componentName, code)

  // Transform imports to use our module registry
  const transformedCode = transformImports(code)

  // Use native ESM import via blob URL
  const module = await importFromString(transformedCode)

  // Cache the result
  moduleCache.set(code, module)

  return module
}

/**
 * Get a specific export from a module.
 */
function getExport(
  module: Record<string, unknown>,
  exportName: string,
  componentName: string
): LoadedComponent {
  const component = module[exportName]

  if (component === undefined) {
    throw new ExportNotFoundError(exportName, componentName, Object.keys(module))
  }

  return component as LoadedComponent
}

/**
 * Hook to dynamically load and render a server component.
 *
 * Uses React Query's useSuspenseQuery for caching and Suspense integration.
 * Components are fetched from `/api/bundles/{name}.js` and cached in memory.
 *
 * @param name - The component name (e.g., "counter", "store:product")
 * @param exportName - Named export to use (default: "default")
 * @returns The loaded React component
 *
 * @throws {InvalidComponentNameError} If name is empty or contains path traversal characters
 * @throws {ComponentNotFoundError} If the component doesn't exist on the server
 * @throws {ExportNotFoundError} If the requested export doesn't exist in the module
 *
 * @example
 * ```tsx
 * import { useComponent } from '@wilcojs/react';
 *
 * function Dashboard() {
 *   // Load default export
 *   const Counter = useComponent('counter');
 *
 *   // Load named export
 *   const ContactRow = useComponent('contact', 'ContactRow');
 *
 *   return <Counter initialValue={10} />;
 * }
 * ```
 */
export function useComponent(name: string, exportName = "default"): LoadedComponent {
  // Validate inputs at API boundary
  validateComponentName(name)

  // Fetch the bundle code
  const { data: code } = useSuspenseQuery({
    queryKey: ["component", name],
    queryFn: () => fetchBundleCode(name),
    staleTime: Infinity, // Components don't go stale
  })

  // Load the module (async, but cached after first load)
  const { data: module } = useSuspenseQuery({
    queryKey: ["component-module", name, code],
    queryFn: () => loadModule(code, name),
    staleTime: Infinity,
  })

  // Get the specific export
  return useMemo(
    () => getExport(module, exportName, name),
    [module, exportName, name]
  )
}
