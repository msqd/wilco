/**
 * Native ESM module loading using Blob URLs and dynamic import().
 *
 * This module transforms ESM imports to use our runtime module registry,
 * then uses the browser's native ESM parser via dynamic import() to handle exports.
 */

import { ExportNotFoundError } from "./errors.ts"

/**
 * Transform ESM import statements to use the runtime module registry.
 *
 * Converts:
 *   import { useState } from "react"
 * To:
 *   const { useState } = window.__MODULES__["react"]
 *
 * @param code - ESM code with import statements
 * @returns Code with imports transformed to use window.__MODULES__
 */
export function transformImports(code: string): string {
  let result = code

  // Transform named imports: import { x, y as z } from "module"
  result = result.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];?/g,
    (_, imports: string, moduleName: string) => {
      // Convert ESM "as" syntax to destructuring ":" syntax
      const fixedImports = imports.replace(/(\w+)\s+as\s+(\w+)/g, "$1: $2")
      return `const {${fixedImports}} = window.__MODULES__["${moduleName}"];`
    }
  )

  // Transform default imports: import React from "module"
  result = result.replace(
    /import\s+(\w+)\s+from\s*["']([^"']+)["'];?/g,
    (_, name: string, moduleName: string) => {
      return `const ${name} = window.__MODULES__["${moduleName}"].default;`
    }
  )

  // Transform namespace imports: import * as React from "module"
  result = result.replace(
    /import\s*\*\s*as\s+(\w+)\s+from\s*["']([^"']+)["'];?/g,
    (_, name: string, moduleName: string) => {
      return `const ${name} = window.__MODULES__["${moduleName}"];`
    }
  )

  return result
}

/**
 * Create a blob URL from code and import it as an ESM module.
 * This is the core browser-native ESM loading mechanism.
 */
async function importBlobUrl(url: string): Promise<Record<string, unknown>> {
  // Dynamic import of blob URL - only works in real browsers, not jsdom
  const module = await import(/* @vite-ignore */ url)
  return module as Record<string, unknown>
}

// Allow injection of import function for testing
let dynamicImport = importBlobUrl

/**
 * Set a custom import function (for testing).
 * @internal
 */
export function setDynamicImport(fn: typeof importBlobUrl): void {
  dynamicImport = fn
}

/**
 * Reset to the default import function.
 * @internal
 */
export function resetDynamicImport(): void {
  dynamicImport = importBlobUrl
}

/**
 * Import an ESM module from code string using native browser import().
 *
 * @param code - ESM code (with exports intact)
 * @returns Promise resolving to the module's exports object
 */
export async function importFromString(code: string): Promise<Record<string, unknown>> {
  const blob = new Blob([code], { type: "text/javascript" })
  const url = URL.createObjectURL(blob)

  try {
    return await dynamicImport(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Load and compile a component from ESM code.
 *
 * @param code - The raw ESM bundle code
 * @param componentName - Name for debugging/source maps
 * @param exportName - Which export to return (default: "default")
 * @returns Promise resolving to the component
 * @throws {ExportNotFoundError} If the requested export doesn't exist in the module
 */
export async function loadComponent(
  code: string,
  componentName: string,
  exportName = "default"
): Promise<unknown> {
  // Transform imports to use our module registry
  const transformedCode = transformImports(code)

  // Import using native ESM
  const module = await importFromString(transformedCode)

  // Get the requested export
  const component = module[exportName]
  if (component === undefined) {
    throw new ExportNotFoundError(exportName, componentName, Object.keys(module))
  }

  return component
}
