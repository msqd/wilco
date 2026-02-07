import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { transformEsmToRuntime } from "./standalone"

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe("transformEsmToRuntime", () => {
  describe("import transformation", () => {
    it("transforms named imports", () => {
      const code = 'import { useState, useEffect } from "react";'
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('const { useState, useEffect } = window.__MODULES__["react"];')
    })

    it("transforms imports with 'as' aliases", () => {
      const code = 'import { jsx as _jsx } from "react/jsx-runtime";'
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('const { jsx: _jsx } = window.__MODULES__["react/jsx-runtime"];')
    })

    it("transforms default imports to use .default", () => {
      const code = 'import React from "react";'
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('const React = window.__MODULES__["react"].default;')
    })

    it("transforms namespace imports", () => {
      const code = 'import * as React from "react";'
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('const React = window.__MODULES__["react"];')
    })

    it("transforms multiple import statements", () => {
      const code = `import { useState } from "react";
import { jsx } from "react/jsx-runtime";`
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('const { useState } = window.__MODULES__["react"];')
      expect(result).toContain('const { jsx } = window.__MODULES__["react/jsx-runtime"];')
    })
  })

  describe("export transformation", () => {
    it("extracts default export and adds return statement", () => {
      const code = `function Counter() { return null; }
export { Counter as default };`
      const result = transformEsmToRuntime(code, "test")

      expect(result).not.toContain("export")
      expect(result).toContain("return Counter;")
    })

    it("removes named exports when default is present", () => {
      const code = `function Foo() {}
function Bar() {}
export { Foo, Bar, Foo as default };`
      const result = transformEsmToRuntime(code, "test")

      expect(result).not.toContain("export")
      expect(result).toContain("return Foo;")
    })

    it("handles multi-line export statements", () => {
      const code = `function A() {}
export {
  A,
  A as default
};`
      const result = transformEsmToRuntime(code, "test")

      expect(result).not.toContain("export")
      expect(result).toContain("return A;")
    })
  })

  describe("source map handling", () => {
    it("preserves source map comments", () => {
      const code = `function Foo() {}
export { Foo as default };
//# sourceMappingURL=data:application/json;base64,abc123`
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain("//# sourceMappingURL=data:application/json;base64,abc123")
    })

    it("adds sourceURL for debugging", () => {
      const code = `function Foo() {}
export { Foo as default };`
      const result = transformEsmToRuntime(code, "counter")

      expect(result).toContain("//# sourceURL=components://bundles/counter.js")
    })

    it("places sourceURL before source map", () => {
      const code = `function Foo() {}
export { Foo as default };
//# sourceMappingURL=data:application/json;base64,abc`
      const result = transformEsmToRuntime(code, "test")

      const sourceUrlIndex = result.indexOf("sourceURL")
      const sourceMappingUrlIndex = result.indexOf("sourceMappingURL")
      expect(sourceUrlIndex).toBeLessThan(sourceMappingUrlIndex)
    })
  })

  describe("preserves non-import/export code", () => {
    it("keeps function definitions intact", () => {
      const code = `import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return count;
}

export { Counter as default };`
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain("function Counter()")
      expect(result).toContain("const [count, setCount] = useState(0);")
      expect(result).toContain("return count;")
    })

    it("preserves JSX-like expressions", () => {
      const code = `import { jsx } from "react/jsx-runtime";
function App() {
  return jsx("div", { children: "Hello" });
}
export { App as default };`
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('jsx("div", { children: "Hello" })')
    })
  })

  describe("edge cases", () => {
    it("handles code with no imports", () => {
      const code = `function Foo() { return null; }
export { Foo as default };`
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain("function Foo()")
      expect(result).toContain("return Foo;")
    })

    it("handles code with no exports (legacy)", () => {
      const code = `import { useState } from "react";
function Counter() { return 42; }`
      const result = transformEsmToRuntime(code, "test")

      // Should still transform imports even without exports
      expect(result).toContain('window.__MODULES__["react"]')
      // No "return ComponentName;" added at the end since no default export
      // (but the function's own "return 42;" is preserved)
      expect(result).not.toMatch(/\nreturn \w+;\n/)
    })

    it("handles empty code", () => {
      const result = transformEsmToRuntime("", "test")
      expect(result).toContain("//# sourceURL=components://bundles/test.js")
    })
  })
})

describe("standalone loader integration", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Reset window.__MODULES__ to default state
    window.__MODULES__ = {
      react: { useState: vi.fn(), default: {} },
      "react/jsx-runtime": { jsx: vi.fn(), jsxs: vi.fn() },
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("module registry", () => {
    it("exposes react module", () => {
      expect(window.__MODULES__["react"]).toBeDefined()
    })

    it("exposes react/jsx-runtime module", () => {
      expect(window.__MODULES__["react/jsx-runtime"]).toBeDefined()
    })
  })
})
