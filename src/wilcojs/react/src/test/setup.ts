import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, vi } from "vitest"

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.__MODULES__ for loader tests
beforeEach(() => {
  window.__MODULES__ = {}
})

// Mock fetch globally
vi.stubGlobal("fetch", vi.fn())

// Extend window type for tests
declare global {
  interface Window {
    __MODULES__: Record<string, unknown>
  }
}
