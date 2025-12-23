import { describe, it, expect, beforeEach, vi } from "vitest"
import { transformEsmToRuntime, compileComponent } from "./useComponent"

describe("transformEsmToRuntime", () => {
  describe("import transformation", () => {
    it("transforms named imports from react", () => {
      const code = 'import { useState, useEffect } from "react";'
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('const { useState, useEffect } = window.__MODULES__["react"];')
      expect(result).not.toContain("import")
    })

    it("transforms namespace imports", () => {
      const code = 'import * as React from "react";'
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('const * as React = window.__MODULES__["react"];')
    })

    it("transforms default imports", () => {
      const code = 'import React from "react";'
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('const React = window.__MODULES__["react"];')
    })

    it("transforms imports with 'as' aliases", () => {
      const code = 'import { jsx as _jsx } from "react/jsx-runtime";'
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('const { jsx: _jsx } = window.__MODULES__["react/jsx-runtime"];')
    })

    it("handles multiple imports", () => {
      const code = `
import { useState } from "react";
import { jsx } from "react/jsx-runtime";
`
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain('window.__MODULES__["react"]')
      expect(result).toContain('window.__MODULES__["react/jsx-runtime"]')
    })
  })

  describe("export transformation", () => {
    it("transforms default export to return statement", () => {
      const code = `
function Counter() { return null; }
export { Counter as default };
`
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain("return Counter;")
      expect(result).not.toContain("export {")
    })

    it("handles export with extra whitespace", () => {
      const code = "export {  MyComponent  as  default  };"
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain("return MyComponent;")
    })
  })

  describe("source map handling", () => {
    it("preserves source map comments", () => {
      const code = `const x = 1;
//# sourceMappingURL=data:application/json;base64,abc123`
      const result = transformEsmToRuntime(code, "test")

      expect(result).toContain("//# sourceMappingURL=data:application/json;base64,abc123")
    })

    it("adds sourceURL for debugging", () => {
      const code = "const x = 1;"
      const result = transformEsmToRuntime(code, "counter")

      expect(result).toContain("//# sourceURL=components://bundles/counter.js")
    })

    it("preserves source map after sourceURL", () => {
      const code = `const x = 1;
//# sourceMappingURL=data:test`
      const result = transformEsmToRuntime(code, "counter")

      const sourceUrlIndex = result.indexOf("sourceURL")
      const sourceMappingIndex = result.indexOf("sourceMappingURL")

      expect(sourceUrlIndex).toBeLessThan(sourceMappingIndex)
    })
  })

  describe("complete component code", () => {
    it("transforms a complete component bundle", () => {
      const code = `import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
function Counter() {
  const [count, setCount] = useState(0);
  return _jsx("button", { onClick: () => setCount(c => c + 1), children: count });
}
export { Counter as default };
//# sourceMappingURL=data:application/json;base64,test`
      const result = transformEsmToRuntime(code, "counter")

      expect(result).toContain('const { jsx: _jsx } = window.__MODULES__["react/jsx-runtime"];')
      expect(result).toContain('const { useState } = window.__MODULES__["react"];')
      expect(result).toContain("return Counter;")
      expect(result).toContain("sourceURL=components://bundles/counter.js")
      expect(result).toContain("sourceMappingURL=data:application/json;base64,test")
    })
  })
})

describe("compileComponent", () => {
  beforeEach(() => {
    // Set up module registry
    window.__MODULES__ = {
      react: { useState: () => [0, () => {}] },
      "react/jsx-runtime": { jsx: () => null },
    }
  })

  it("compiles and returns a function component", () => {
    const code = `import { jsx } from "react/jsx-runtime";
function Hello() { return jsx("div", { children: "Hello" }); }
export { Hello as default };`

    const Component = compileComponent(code, "hello")

    expect(typeof Component).toBe("function")
  })

  it("caches compiled components", () => {
    const code = `
import { jsx } from "react/jsx-runtime";
function Test() { return null; }
export { Test as default };
`
    const component1 = compileComponent(code, "test")
    const component2 = compileComponent(code, "test")

    expect(component1).toBe(component2)
  })

  it("throws on invalid code", () => {
    const invalidCode = "this is not valid { javascript ("

    // Suppress expected console.error from compileComponent
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => compileComponent(invalidCode, "invalid")).toThrow()

    consoleSpy.mockRestore()
  })
})
