/**
 * Source map registry for server components.
 *
 * This module extracts and stores source maps from bundled component code,
 * allowing stack traces to be mapped back to original TypeScript sources.
 */

import { SourceMapConsumer, type RawSourceMap } from "source-map-js"

interface SourceMapEntry {
  consumer: SourceMapConsumer
  sourceMap: RawSourceMap
}

// Registry of source maps keyed by component name
const sourceMapRegistry = new Map<string, SourceMapEntry>()

// Source URL pattern for our components: component://name/file.tsx
const COMPONENT_URL_PATTERN = /^component:\/\/([^/]+)\/(.+)$/

/**
 * Extract inline source map from bundled JavaScript code.
 */
function extractInlineSourceMap(code: string): RawSourceMap | null {
  const marker = "//# sourceMappingURL=data:application/json;base64,"
  const markerIndex = code.lastIndexOf(marker)

  if (markerIndex === -1) {
    return null
  }

  const base64Data = code.slice(markerIndex + marker.length).trim()

  try {
    const jsonString = atob(base64Data)
    return JSON.parse(jsonString) as RawSourceMap
  } catch {
    console.warn("Failed to parse inline source map")
    return null
  }
}

/**
 * Register source map for a component.
 * Call this when loading a component bundle.
 */
export function registerSourceMap(componentName: string, bundleCode: string): void {
  // Clean up existing entry if any
  const existing = sourceMapRegistry.get(componentName)
  if (existing) {
    sourceMapRegistry.delete(componentName)
  }

  const sourceMap = extractInlineSourceMap(bundleCode)
  if (!sourceMap) {
    return
  }

  try {
    const consumer = new SourceMapConsumer(sourceMap)
    sourceMapRegistry.set(componentName, { consumer, sourceMap })
  } catch (err) {
    console.warn(`Failed to create source map consumer for ${componentName}:`, err)
  }
}

/**
 * Unregister source map for a component.
 * Call this when unloading a component.
 */
export function unregisterSourceMap(componentName: string): void {
  sourceMapRegistry.delete(componentName)
}

export interface OriginalPosition {
  source: string | null
  line: number | null
  column: number | null
  name: string | null
}

/**
 * Map a generated position to original source position.
 */
export function mapToOriginalPosition(componentName: string, line: number, column: number): OriginalPosition | null {
  const entry = sourceMapRegistry.get(componentName)
  if (!entry) {
    return null
  }

  const original = entry.consumer.originalPositionFor({ line, column })

  if (original.source === null || original.source === undefined) {
    return null
  }

  return {
    source: original.source,
    line: original.line ?? null,
    column: original.column ?? null,
    name: original.name ?? null,
  }
}

/**
 * Get the original source content for a source file.
 */
export function getSourceContent(componentName: string, sourcePath: string): string | null {
  const entry = sourceMapRegistry.get(componentName)
  if (!entry) {
    return null
  }

  return entry.consumer.sourceContentFor(sourcePath, true)
}

/**
 * Parse a component URL from our custom scheme.
 * Returns { componentName, fileName } or null if not a component URL.
 */
export function parseComponentUrl(url: string): { componentName: string; fileName: string } | null {
  const match = url.match(COMPONENT_URL_PATTERN)
  if (!match) {
    return null
  }

  return {
    componentName: match[1],
    fileName: match[2],
  }
}

/**
 * Get all sources for a component's source map.
 */
export function getComponentSources(componentName: string): string[] {
  const entry = sourceMapRegistry.get(componentName)
  if (!entry || !entry.sourceMap.sources) {
    return []
  }

  return entry.sourceMap.sources
}

/**
 * Check if a component has a registered source map.
 */
export function hasSourceMap(componentName: string): boolean {
  return sourceMapRegistry.has(componentName)
}
