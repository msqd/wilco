import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  registerSourceMap,
  mapToOriginalPosition,
  getSourceContent,
  parseComponentUrl,
} from "./sourceMapRegistry"

// Helper to create a valid inline source map
function createSourceMapComment(sourceMap: object): string {
  const json = JSON.stringify(sourceMap)
  const base64 = btoa(json)
  return `//# sourceMappingURL=data:application/json;base64,${base64}`
}

// A minimal but valid source map
const validSourceMap = {
  version: 3,
  sources: ["component://counter/Counter.tsx"],
  sourcesContent: ["export function Counter() { return null; }"],
  mappings: "AAAA,OAAO,SAAS,OAAO",
  names: ["Counter"],
}

describe("registerSourceMap", () => {
  beforeEach(() => {
    // Clear console warnings for cleaner test output
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("registers a valid source map", () => {
    const code = `function Counter() { return null; }
${createSourceMapComment(validSourceMap)}`

    // Should not throw
    expect(() => registerSourceMap("counter", code)).not.toThrow()
  })

  it("handles code without source map", () => {
    const code = "function Counter() { return null; }"

    // Should not throw
    expect(() => registerSourceMap("counter", code)).not.toThrow()
  })

  it("handles invalid base64 in source map", () => {
    const code = `function Counter() { return null; }
//# sourceMappingURL=data:application/json;base64,!!!invalid!!`

    // Should not throw, just warn
    expect(() => registerSourceMap("counter", code)).not.toThrow()
    expect(console.warn).toHaveBeenCalled()
  })

  it("handles invalid JSON in source map", () => {
    const invalidJson = btoa("not valid json")
    const code = `function Counter() { return null; }
//# sourceMappingURL=data:application/json;base64,${invalidJson}`

    // Should not throw, just warn
    expect(() => registerSourceMap("counter", code)).not.toThrow()
    expect(console.warn).toHaveBeenCalled()
  })

  it("replaces existing registration for same component", () => {
    const code1 = `function V1() {}
${createSourceMapComment({ ...validSourceMap, sources: ["v1.tsx"] })}`
    const code2 = `function V2() {}
${createSourceMapComment({ ...validSourceMap, sources: ["v2.tsx"] })}`

    registerSourceMap("counter", code1)
    registerSourceMap("counter", code2)

    // Should have only one entry (the second one)
    const position = mapToOriginalPosition("counter", 1, 0)
    expect(position?.source).toBe("v2.tsx")
  })
})

describe("mapToOriginalPosition", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("returns null for unregistered component", () => {
    const result = mapToOriginalPosition("nonexistent", 1, 0)
    expect(result).toBeNull()
  })

  it("returns null for unmapped position", () => {
    // Register with a source map that has no mappings for line 999
    const code = `function Counter() {}
${createSourceMapComment(validSourceMap)}`
    registerSourceMap("counter", code)

    const result = mapToOriginalPosition("counter", 999, 999)
    expect(result).toBeNull()
  })

  it("maps valid position to original", () => {
    const code = `function Counter() {}
${createSourceMapComment(validSourceMap)}`
    registerSourceMap("counter", code)

    // The mappings "AAAA" maps line 1, col 0 to source 0, line 1, col 0
    const result = mapToOriginalPosition("counter", 1, 0)
    expect(result).not.toBeNull()
    expect(result?.source).toBe("component://counter/Counter.tsx")
  })
})

describe("getSourceContent", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  it("returns null for unregistered component", () => {
    const result = getSourceContent("nonexistent", "file.tsx")
    expect(result).toBeNull()
  })

  it("returns null for unknown source path", () => {
    const code = `function Counter() {}
${createSourceMapComment(validSourceMap)}`
    registerSourceMap("counter", code)

    const result = getSourceContent("counter", "unknown.tsx")
    expect(result).toBeNull()
  })

  it("returns source content for known path", () => {
    const code = `function Counter() {}
${createSourceMapComment(validSourceMap)}`
    registerSourceMap("counter", code)

    const result = getSourceContent("counter", "component://counter/Counter.tsx")
    expect(result).toBe("export function Counter() { return null; }")
  })
})

describe("parseComponentUrl", () => {
  it("parses valid component URL", () => {
    const result = parseComponentUrl("component://counter/Counter.tsx")
    expect(result).toEqual({
      componentName: "counter",
      fileName: "Counter.tsx",
    })
  })

  it("parses URL with nested path", () => {
    const result = parseComponentUrl("component://store/products/ProductCard.tsx")
    expect(result).toEqual({
      componentName: "store",
      fileName: "products/ProductCard.tsx",
    })
  })

  it("returns null for non-component URL", () => {
    expect(parseComponentUrl("https://example.com/file.js")).toBeNull()
    expect(parseComponentUrl("file:///local/file.js")).toBeNull()
    expect(parseComponentUrl("./relative/path.js")).toBeNull()
  })

  it("returns null for malformed component URL", () => {
    expect(parseComponentUrl("component://")).toBeNull()
    expect(parseComponentUrl("component:/")).toBeNull()
    expect(parseComponentUrl("component:")).toBeNull()
  })

  it("handles component names with special characters", () => {
    // Component names should be identifiers, but the regex allows anything except /
    const result = parseComponentUrl("component://my-component/File.tsx")
    expect(result).toEqual({
      componentName: "my-component",
      fileName: "File.tsx",
    })
  })
})
