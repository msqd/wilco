import { useMemo, type ComponentType } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { registerSourceMap } from "./sourceMapRegistry.ts"

type LoadedComponent = ComponentType<Record<string, unknown>>

// Cache for compiled components (code -> component)
const compiledCache = new Map<string, LoadedComponent>()

async function fetchBundleCode(name: string): Promise<string> {
  const response = await fetch(`/api/bundles/${name}.js`)
  if (!response.ok) {
    throw new Error(`Component not found: ${name}`)
  }
  return response.text()
}

/**
 * Transform ESM code to work with our runtime module registry.
 * Preserves source map comments for debugging.
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

  // Transform imports: import { x } from "react" -> const { x } = window.__MODULES__["react"]
  // Also convert "as" renames to destructuring syntax: { jsx as jsx2 } -> { jsx: jsx2 }
  transformed = transformed.replace(
    /import\s+(\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s*["']([^"']+)["'];?/g,
    (_, imports, moduleName) => {
      // Convert ESM "as" syntax to destructuring ":" syntax
      const fixedImports = imports.replace(/(\w+)\s+as\s+(\w+)/g, "$1: $2")
      return `const ${fixedImports} = window.__MODULES__["${moduleName}"];`
    },
  )

  // Extract default export name: export { Foo as default } -> return Foo
  const defaultExportMatch = transformed.match(/export\s*\{\s*(\w+)\s+as\s+default\s*\};?/)
  if (defaultExportMatch) {
    const exportName = defaultExportMatch[1]
    // Remove the export statement and add return
    transformed = transformed.replace(/export\s*\{[^}]*\};?/g, "")
    transformed += `\nreturn ${exportName};`
  }

  // Add sourceURL for better debugging (shows component name in devtools)
  transformed += `\n//# sourceURL=components://bundles/${componentName}.js`

  // Re-add source map comment
  if (sourceMapComment) {
    transformed += `\n${sourceMapComment}`
  }

  return transformed
}

function compileComponent(code: string, componentName: string): LoadedComponent {
  const cacheKey = `${componentName}:${code}`
  const cached = compiledCache.get(cacheKey)
  if (cached) return cached

  // Register source map BEFORE compiling
  registerSourceMap(componentName, code)

  const transformedCode = transformEsmToRuntime(code, componentName)

  try {
    const moduleFactory = new Function(transformedCode)
    const Component = moduleFactory() as LoadedComponent
    compiledCache.set(cacheKey, Component)
    return Component
  } catch (err) {
    console.error("Failed to execute component code:", err)
    console.error("Transformed code:", transformedCode.slice(0, 500))
    throw err
  }
}

/**
 * Hook to dynamically load and render a server component.
 * Uses React Query's useSuspenseQuery for caching and Suspense integration.
 *
 * @param name - The component name (e.g., "counter")
 * @returns The loaded React component
 *
 * @example
 * ```tsx
 * import { useComponent } from '@wilcojs/react';
 *
 * function Dashboard() {
 *   const Counter = useComponent('counter');
 *   return <Counter initialValue={10} />;
 * }
 * ```
 */
// Export for testing
export { transformEsmToRuntime, compileComponent }

export function useComponent(name: string): LoadedComponent {
  const { data: code } = useSuspenseQuery({
    queryKey: ["component", name],
    queryFn: () => fetchBundleCode(name),
    staleTime: Infinity, // Components don't go stale
  })

  return useMemo(() => compileComponent(code, name), [code, name])
}
