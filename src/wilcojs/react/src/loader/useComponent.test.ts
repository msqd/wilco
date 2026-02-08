import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import React, { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ComponentNotFoundError, ExportNotFoundError, InvalidComponentNameError } from "./errors"
import { resetDynamicImport, setDynamicImport } from "./esm"
import { useComponent } from "./useComponent"

// Mock fetch for bundle loading
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

describe("useComponent", () => {
  let queryClient: QueryClient
  const mockImport = vi.fn()

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    mockFetch.mockReset()
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
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(Suspense, { fallback: React.createElement("div", null, "Loading...") }, children),
    )

  it("fetches and loads a component", async () => {
    const bundleCode = `
function Counter() { return null; }
export { Counter as default };
`
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(bundleCode),
    })

    const Counter = function Counter() {
      return null
    }
    mockImport.mockResolvedValue({ default: Counter })

    const { result } = renderHook(() => useComponent("counter"), { wrapper })

    await waitFor(() => {
      expect(result.current).toBe(Counter)
    })
  })

  it("loads a named export when specified", async () => {
    const bundleCode = `
function ContactCard() { return "card"; }
function ContactRow() { return "row"; }
export { ContactCard, ContactRow, ContactCard as default };
`
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(bundleCode),
    })

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

    const { result } = renderHook(() => useComponent("contact", "ContactRow"), {
      wrapper,
    })

    await waitFor(() => {
      expect(result.current).toBe(ContactRow)
    })
  })

  it("caches the module across multiple useComponent calls", async () => {
    const bundleCode = `export function Foo() { return null; }`
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(bundleCode),
    })

    const Foo = function Foo() {
      return null
    }
    mockImport.mockResolvedValue({ Foo, default: Foo })

    // First call
    const { result: result1 } = renderHook(() => useComponent("test"), {
      wrapper,
    })
    await waitFor(() => expect(result1.current).toBeDefined())

    // Second call for same component
    const { result: result2 } = renderHook(() => useComponent("test"), {
      wrapper,
    })
    await waitFor(() => expect(result2.current).toBeDefined())

    // Should only import once due to caching
    expect(mockImport).toHaveBeenCalledTimes(1)
  })

  it("throws error when component is not found", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    })

    // Capture error via error boundary
    let capturedError: Error | null = null
    const errorWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          ErrorBoundary,
          {
            fallback: React.createElement("div", null, "Error"),
            onError: (error: Error) => {
              capturedError = error
            },
          },
          React.createElement(Suspense, { fallback: React.createElement("div", null, "Loading...") }, children),
        ),
      )

    renderHook(() => useComponent("nonexistent"), {
      wrapper: errorWrapper,
    })

    await waitFor(() => {
      expect(capturedError).not.toBeNull()
      expect(capturedError).toBeInstanceOf(ComponentNotFoundError)
      expect(capturedError?.message).toContain("Component not found")
    })
  })

  it("throws error for non-existent export", async () => {
    const bundleCode = `export function Foo() { return null; }`
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(bundleCode),
    })

    mockImport.mockResolvedValue({
      Foo: function Foo() {
        return null
      },
      default: function Foo() {
        return null
      },
    })

    // Capture error via error boundary
    let capturedError: Error | null = null
    const errorWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          ErrorBoundary,
          {
            fallback: React.createElement("div", null, "Error"),
            onError: (error: Error) => {
              capturedError = error
            },
          },
          React.createElement(Suspense, { fallback: React.createElement("div", null, "Loading...") }, children),
        ),
      )

    renderHook(() => useComponent("test", "Bar"), {
      wrapper: errorWrapper,
    })

    await waitFor(() => {
      expect(capturedError).not.toBeNull()
      expect(capturedError).toBeInstanceOf(ExportNotFoundError)
      expect(capturedError?.message).toContain('Export "Bar" not found')
    })
  })

  it("throws InvalidComponentNameError for empty name", () => {
    let capturedError: Error | null = null
    const errorWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          ErrorBoundary,
          {
            fallback: React.createElement("div", null, "Error"),
            onError: (error: Error) => {
              capturedError = error
            },
          },
          React.createElement(Suspense, { fallback: React.createElement("div", null, "Loading...") }, children),
        ),
      )

    renderHook(() => useComponent(""), {
      wrapper: errorWrapper,
    })

    // Validation happens synchronously, no need to wait
    expect(capturedError).not.toBeNull()
    expect(capturedError).toBeInstanceOf(InvalidComponentNameError)
    expect(capturedError!.message).toContain("must be a non-empty string")
  })

  it("throws InvalidComponentNameError for path traversal", () => {
    let capturedError: Error | null = null
    const errorWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          ErrorBoundary,
          {
            fallback: React.createElement("div", null, "Error"),
            onError: (error: Error) => {
              capturedError = error
            },
          },
          React.createElement(Suspense, { fallback: React.createElement("div", null, "Loading...") }, children),
        ),
      )

    renderHook(() => useComponent("../../../etc/passwd"), {
      wrapper: errorWrapper,
    })

    expect(capturedError).not.toBeNull()
    expect(capturedError).toBeInstanceOf(InvalidComponentNameError)
    expect(capturedError!.message).toContain("cannot contain path traversal")
  })
})
