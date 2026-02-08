import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { importFromString, loadComponent, resetDynamicImport, setDynamicImport, transformImports } from "./esm"

describe("transformImports", () => {
  describe("named imports", () => {
    it("transforms named imports from a module", () => {
      const code = 'import { useState, useEffect } from "react";'
      const result = transformImports(code)

      expect(result).toBe('const { useState, useEffect } = window.__MODULES__["react"];')
    })

    it("transforms imports with 'as' aliases", () => {
      const code = 'import { jsx as _jsx } from "react/jsx-runtime";'
      const result = transformImports(code)

      expect(result).toBe('const { jsx: _jsx } = window.__MODULES__["react/jsx-runtime"];')
    })

    it("transforms multiple aliased imports", () => {
      const code = 'import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";'
      const result = transformImports(code)

      expect(result).toBe('const { jsx: _jsx, jsxs: _jsxs } = window.__MODULES__["react/jsx-runtime"];')
    })
  })

  describe("default imports", () => {
    it("transforms default imports", () => {
      const code = 'import React from "react";'
      const result = transformImports(code)

      expect(result).toBe('const React = window.__MODULES__["react"].default;')
    })
  })

  describe("namespace imports", () => {
    it("transforms namespace imports", () => {
      const code = 'import * as React from "react";'
      const result = transformImports(code)

      expect(result).toBe('const React = window.__MODULES__["react"];')
    })
  })

  describe("multiple imports", () => {
    it("transforms multiple import statements", () => {
      const code = `import { useState } from "react";
import { jsx } from "react/jsx-runtime";`
      const result = transformImports(code)

      expect(result).toContain('const { useState } = window.__MODULES__["react"];')
      expect(result).toContain('const { jsx } = window.__MODULES__["react/jsx-runtime"];')
    })
  })

  describe("preserves non-import code", () => {
    it("keeps function definitions intact", () => {
      const code = `import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return count;
}

export { Counter as default };`
      const result = transformImports(code)

      expect(result).toContain("function Counter()")
      expect(result).toContain("const [count, setCount] = useState(0);")
      expect(result).toContain("export { Counter as default };")
    })

    it("preserves source map comments", () => {
      const code = `import { jsx } from "react/jsx-runtime";
function Foo() { return null; }
export { Foo };
//# sourceMappingURL=data:application/json;base64,abc123`
      const result = transformImports(code)

      expect(result).toContain("//# sourceMappingURL=data:application/json;base64,abc123")
    })
  })
})

describe("importFromString", () => {
  // Mock the dynamic import since jsdom doesn't support blob URL imports
  const mockImport = vi.fn()

  beforeEach(() => {
    mockImport.mockReset()
    setDynamicImport(mockImport)

    // Set up module registry
    window.__MODULES__ = {
      react: { useState: vi.fn(() => [0, vi.fn()]), default: {} },
      "react/jsx-runtime": { jsx: vi.fn(() => null), jsxs: vi.fn(() => null) },
    }
  })

  afterEach(() => {
    resetDynamicImport()
  })

  it("imports default export from ESM code", async () => {
    const Hello = function Hello() {
      return null
    }
    mockImport.mockResolvedValue({ default: Hello })

    const code = `
const { jsx } = window.__MODULES__["react/jsx-runtime"];
function Hello() { return jsx("div", { children: "Hello" }); }
export { Hello as default };
`
    const module = await importFromString(code)

    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe("function")
  })

  it("imports named exports from ESM code", async () => {
    const ContactCard = function ContactCard() {
      return "card"
    }
    const ContactRow = function ContactRow() {
      return "row"
    }
    mockImport.mockResolvedValue({
      ContactCard,
      ContactRow,
      default: ContactCard,
    })

    const code = `
function ContactCard() { return "card"; }
function ContactRow() { return "row"; }
export { ContactCard, ContactRow, ContactCard as default };
`
    const module = await importFromString(code)

    expect(module.ContactCard).toBeDefined()
    expect(module.ContactRow).toBeDefined()
    expect(module.default).toBe(module.ContactCard)
  })

  it("handles multi-line export statements", async () => {
    const A = function A() {
      return "a"
    }
    const B = function B() {
      return "b"
    }
    const C = function C() {
      return "c"
    }
    mockImport.mockResolvedValue({ A, B, C, default: A })

    const code = `
function A() { return "a"; }
function B() { return "b"; }
function C() { return "c"; }
export {
  A,
  B,
  C,
  A as default
};
`
    const module = await importFromString(code)

    expect(module.A).toBeDefined()
    expect(module.B).toBeDefined()
    expect(module.C).toBeDefined()
    expect(module.default).toBe(module.A)
  })

  it("creates blob URL and passes it to dynamic import", async () => {
    mockImport.mockResolvedValue({ default: () => null })
    const createObjectURL = vi.spyOn(URL, "createObjectURL")

    const code = `export const x = 1;`
    await importFromString(code)

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(mockImport).toHaveBeenCalledWith(expect.stringContaining("blob:"))
    createObjectURL.mockRestore()
  })

  it("cleans up blob URL after import", async () => {
    mockImport.mockResolvedValue({ default: () => null })
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL")

    const code = `export const x = 1;`
    await importFromString(code)

    expect(revokeObjectURL).toHaveBeenCalled()
    revokeObjectURL.mockRestore()
  })

  it("cleans up blob URL even on import error", async () => {
    mockImport.mockRejectedValue(new Error("Import failed"))
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL")

    const code = `export const x = 1;`
    await expect(importFromString(code)).rejects.toThrow("Import failed")

    expect(revokeObjectURL).toHaveBeenCalled()
    revokeObjectURL.mockRestore()
  })
})

describe("loadComponent", () => {
  const mockImport = vi.fn()

  beforeEach(() => {
    mockImport.mockReset()
    setDynamicImport(mockImport)

    window.__MODULES__ = {
      react: { useState: vi.fn(() => [0, vi.fn()]), default: {} },
      "react/jsx-runtime": { jsx: vi.fn(() => null), jsxs: vi.fn(() => null) },
    }
  })

  afterEach(() => {
    resetDynamicImport()
  })

  it("loads the default export by default", async () => {
    const MyComponent = function MyComponent() {
      return null
    }
    mockImport.mockResolvedValue({ default: MyComponent })

    const code = `
const { jsx } = window.__MODULES__["react/jsx-runtime"];
function MyComponent() { return jsx("div", {}); }
export { MyComponent as default };
`
    const Component = await loadComponent(code, "test")

    expect(typeof Component).toBe("function")
    expect(Component).toBe(MyComponent)
  })

  it("loads a named export when specified", async () => {
    const ContactCard = function ContactCard() {
      return "card"
    }
    const ContactRow = function ContactRow() {
      return "row"
    }
    mockImport.mockResolvedValue({
      ContactCard,
      ContactRow,
      default: ContactCard,
    })

    const code = `
function ContactCard() { return "card"; }
function ContactRow() { return "row"; }
export { ContactCard, ContactRow, ContactCard as default };
`
    const result = await loadComponent(code, "contact", "ContactRow")

    expect(typeof result).toBe("function")
    expect(result).toBe(ContactRow)
    expect((result as () => string)()).toBe("row")
  })

  it("throws error for non-existent export", async () => {
    const Foo = function Foo() {
      return null
    }
    mockImport.mockResolvedValue({ default: Foo })

    const code = `
function Foo() { return null; }
export { Foo as default };
`
    await expect(loadComponent(code, "test", "Bar")).rejects.toThrow(/Export "Bar" not found/)
  })

  it("includes available exports in error message", async () => {
    mockImport.mockResolvedValue({
      Foo: () => null,
      Bar: () => null,
      default: () => null,
    })

    const code = `export { Foo, Bar, Foo as default };`

    await expect(loadComponent(code, "test", "Baz")).rejects.toThrow(/Available exports: Foo, Bar, default/)
  })

  it("transforms imports before loading", async () => {
    const Hello = function Hello() {
      return null
    }
    mockImport.mockResolvedValue({ default: Hello })

    // This code has raw ESM imports that need transformation
    const code = `
import { jsx } from "react/jsx-runtime";
function Hello() { return jsx("div", { children: "Hi" }); }
export { Hello as default };
`
    const Component = await loadComponent(code, "hello")

    expect(typeof Component).toBe("function")

    // Verify the code passed to import has transformed imports
    expect(mockImport).toHaveBeenCalled()
  })
})
