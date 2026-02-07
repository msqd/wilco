import { describe, it, expect } from "vitest"
import {
  ComponentNotFoundError,
  ExportNotFoundError,
  BundleLoadError,
  InvalidComponentNameError,
  isWilcoError,
} from "./errors"

describe("ComponentNotFoundError", () => {
  it("stores component name", () => {
    const error = new ComponentNotFoundError("counter")
    expect(error.componentName).toBe("counter")
  })

  it("has descriptive message", () => {
    const error = new ComponentNotFoundError("counter")
    expect(error.message).toBe('Component not found: "counter"')
  })

  it("has correct error name", () => {
    const error = new ComponentNotFoundError("counter")
    expect(error.name).toBe("ComponentNotFoundError")
  })

  it("is instance of Error", () => {
    const error = new ComponentNotFoundError("counter")
    expect(error).toBeInstanceOf(Error)
  })
})

describe("ExportNotFoundError", () => {
  it("stores export name and component name", () => {
    const error = new ExportNotFoundError("Counter", "test", ["Foo", "Bar"])
    expect(error.exportName).toBe("Counter")
    expect(error.componentName).toBe("test")
    expect(error.availableExports).toEqual(["Foo", "Bar"])
  })

  it("has descriptive message with available exports", () => {
    const error = new ExportNotFoundError("Counter", "test", ["Foo", "Bar", "default"])
    expect(error.message).toBe(
      'Export "Counter" not found in component "test". Available exports: Foo, Bar, default'
    )
  })

  it("handles empty available exports", () => {
    const error = new ExportNotFoundError("Counter", "test", [])
    expect(error.message).toBe(
      'Export "Counter" not found in component "test". Available exports: (none)'
    )
  })

  it("has correct error name", () => {
    const error = new ExportNotFoundError("Counter", "test", [])
    expect(error.name).toBe("ExportNotFoundError")
  })
})

describe("BundleLoadError", () => {
  it("stores component name and cause", () => {
    const cause = new Error("Network error")
    const error = new BundleLoadError("counter", cause)
    expect(error.componentName).toBe("counter")
    expect(error.cause).toBe(cause)
  })

  it("has descriptive message with cause", () => {
    const cause = new Error("Network error")
    const error = new BundleLoadError("counter", cause)
    expect(error.message).toBe('Failed to load bundle for "counter": Network error')
  })

  it("has correct error name", () => {
    const cause = new Error("Network error")
    const error = new BundleLoadError("counter", cause)
    expect(error.name).toBe("BundleLoadError")
  })
})

describe("InvalidComponentNameError", () => {
  it("stores component name", () => {
    const error = new InvalidComponentNameError("../evil", "cannot contain path traversal")
    expect(error.componentName).toBe("../evil")
  })

  it("has descriptive message for string name", () => {
    const error = new InvalidComponentNameError("../evil", "cannot contain path traversal")
    expect(error.message).toBe('Invalid component name "../evil": cannot contain path traversal')
  })

  it("has descriptive message for non-string name", () => {
    const error = new InvalidComponentNameError(null, "must be a non-empty string")
    expect(error.message).toBe("Invalid component name null: must be a non-empty string")
  })

  it("has correct error name", () => {
    const error = new InvalidComponentNameError("bad", "reason")
    expect(error.name).toBe("InvalidComponentNameError")
  })

  it("is instance of Error", () => {
    const error = new InvalidComponentNameError("bad", "reason")
    expect(error).toBeInstanceOf(Error)
  })
})

describe("isWilcoError", () => {
  it("returns true for ComponentNotFoundError", () => {
    const error = new ComponentNotFoundError("counter")
    expect(isWilcoError(error)).toBe(true)
  })

  it("returns true for ExportNotFoundError", () => {
    const error = new ExportNotFoundError("Counter", "test", [])
    expect(isWilcoError(error)).toBe(true)
  })

  it("returns true for BundleLoadError", () => {
    const error = new BundleLoadError("counter", new Error("fail"))
    expect(isWilcoError(error)).toBe(true)
  })

  it("returns true for InvalidComponentNameError", () => {
    const error = new InvalidComponentNameError("bad", "reason")
    expect(isWilcoError(error)).toBe(true)
  })

  it("returns false for generic Error", () => {
    const error = new Error("generic")
    expect(isWilcoError(error)).toBe(false)
  })

  it("returns false for non-errors", () => {
    expect(isWilcoError("not an error")).toBe(false)
    expect(isWilcoError(null)).toBe(false)
    expect(isWilcoError(undefined)).toBe(false)
  })
})
