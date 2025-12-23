import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { StackTrace } from "./StackTrace"

// Mock the source map registry
vi.mock("../loader/sourceMapRegistry.ts", () => ({
  mapToOriginalPosition: vi.fn(() => null),
  getSourceContent: vi.fn(() => null),
  parseComponentUrl: vi.fn(() => null),
}))

// Mock stacktracey
vi.mock("stacktracey", () => ({
  default: class MockStackTracey {
    items: Array<{
      callee: string
      file: string
      line: number
      column: number
      thirdParty: boolean
    }>

    constructor(error: Error) {
      // Parse simple stack trace format
      const stack = error.stack || ""
      this.items = stack
        .split("\n")
        .filter((line) => line.includes("at "))
        .map((line) => {
          const match = line.match(/at\s+(\S+)\s+\(([^:]+):(\d+):(\d+)\)/)
          if (match) {
            return {
              callee: match[1],
              file: match[2],
              line: parseInt(match[3], 10),
              column: parseInt(match[4], 10),
              thirdParty: match[2].includes("node_modules"),
            }
          }
          return {
            callee: "<anonymous>",
            file: "unknown",
            line: 0,
            column: 0,
            thirdParty: false,
          }
        })
    }
  },
}))

describe("StackTrace", () => {
  it("renders without crashing", () => {
    const error = new Error("Test error")
    error.stack = "Error: Test error\n    at test (/src/test.ts:1:1)"

    // Should not throw
    expect(() => render(<StackTrace error={error} />)).not.toThrow()
  })

  it("shows error stack when available", async () => {
    const error = new Error("Test error")
    error.stack = "Error: Test error\n    at TestComponent (/src/App.tsx:10:5)"

    render(<StackTrace error={error} />)

    await waitFor(() => {
      expect(screen.queryByText(/parsing stack trace/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText("Error Location")).toBeInTheDocument()
  })

  it("shows raw stack when parsing fails", async () => {
    const error = new Error("Test error")
    error.stack = "This is not a parseable stack"

    render(<StackTrace error={error} />)

    await waitFor(() => {
      expect(screen.queryByText(/parsing stack trace/i)).not.toBeInTheDocument()
    })

    // Should show fallback with raw stack
    expect(screen.getByText(/this is not a parseable stack/i)).toBeInTheDocument()
  })

  it("shows component tree when componentStack provided", async () => {
    const error = new Error("Test error")
    error.stack = "Error: Test\n    at Component (/src/test.tsx:5:10)"

    const componentStack = `
    at Dashboard (components://bundles/dashboard.js:10:5)
    at App (http://localhost:5173/src/App.tsx:20:10)
    `

    render(<StackTrace error={error} componentStack={componentStack} />)

    await waitFor(() => {
      expect(screen.queryByText(/parsing stack trace/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText("Component Tree")).toBeInTheDocument()
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("App")).toBeInTheDocument()
  })

  it("filters out lowercase HTML elements from component stack", async () => {
    const error = new Error("Test error")
    error.stack = "Error: Test"

    const componentStack = `
    at div
    at span
    at Dashboard (components://bundles/dashboard.js:10:5)
    at button
    `

    render(<StackTrace error={error} componentStack={componentStack} />)

    await waitFor(() => {
      expect(screen.queryByText(/parsing stack trace/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.queryByText("div")).not.toBeInTheDocument()
    expect(screen.queryByText("span")).not.toBeInTheDocument()
    expect(screen.queryByText("button")).not.toBeInTheDocument()
  })

  it("shows badge for server components", async () => {
    const error = new Error("Test error")
    error.stack = "Error: Test"

    const componentStack = `
    at Counter (components://bundles/counter.js:5:10)
    `

    render(<StackTrace error={error} componentStack={componentStack} />)

    await waitFor(() => {
      expect(screen.queryByText(/parsing stack trace/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText("component")).toBeInTheDocument()
  })

  it("displays frame index numbers", async () => {
    const error = new Error("Test error")
    error.stack = "Error: Test"

    const componentStack = `
    at First (components://bundles/first.js:1:1)
    at Second (components://bundles/second.js:2:2)
    `

    render(<StackTrace error={error} componentStack={componentStack} />)

    await waitFor(() => {
      expect(screen.queryByText(/parsing stack trace/i)).not.toBeInTheDocument()
    })

    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })
})
