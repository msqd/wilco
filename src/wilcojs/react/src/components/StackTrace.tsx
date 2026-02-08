import { useEffect, useState } from "react"
import StackTracey from "stacktracey"
import { getSourceContent, mapToOriginalPosition, parseComponentUrl } from "../loader/sourceMapRegistry.ts"

interface StackTraceProps {
  error: Error
  componentStack?: string
}

interface StackFrame {
  callee: string
  file: string
  line: number
  column: number
  sourceLine?: string
  thirdParty: boolean
  isServerComponent: boolean
  originalFile?: string
  originalLine?: number
  originalColumn?: number
}

// Pattern to match our dynamically loaded component URLs
// Component names use dots (e.g., crasher) so we match until .js
const COMPONENT_URL_PATTERN = /^components:\/\/bundles\/(.+)\.js$/

// new Function() adds wrapper lines that offset line numbers in stack traces
// We need to subtract this offset to get the correct source map position
const NEW_FUNCTION_LINE_OFFSET = 2

/**
 * Extract a source line from source content given a line number.
 */
function getSourceLine(sourceContent: string | null, line: number): string | undefined {
  if (!sourceContent || line <= 0) return undefined
  const lines = sourceContent.split("\n")
  if (line > lines.length) return undefined
  return lines[line - 1]?.trim()
}

/**
 * Resolve a stack frame to its original source location using source maps.
 */
function resolveFrame(file: string, line: number, column: number, callee: string): Partial<StackFrame> {
  // Check if this is a wilco component URL
  const urlMatch = file.match(COMPONENT_URL_PATTERN)
  if (!urlMatch) {
    return {}
  }

  const componentName = urlMatch[1]

  // Adjust line number to account for new Function() wrapper offset
  const adjustedLine = line - NEW_FUNCTION_LINE_OFFSET

  // Try to get original position from source map
  const original = mapToOriginalPosition(componentName, adjustedLine, column)
  if (!original || !original.source) {
    return { isServerComponent: true }
  }

  // Parse the component:// URL from the source map
  const componentUrl = parseComponentUrl(original.source)
  const displayFile = componentUrl?.fileName || original.source

  // Get source content for the original file
  const sourceContent = getSourceContent(componentName, original.source)
  const sourceLine = getSourceLine(sourceContent, original.line || 0)

  return {
    isServerComponent: true,
    originalFile: displayFile,
    originalLine: original.line || undefined,
    originalColumn: original.column || undefined,
    callee: original.name || callee,
    sourceLine,
  }
}

/**
 * Parse React's componentStack string into structured frames.
 */
function parseComponentStack(componentStack: string): StackFrame[] {
  const lines = componentStack.trim().split("\n")
  const frames: StackFrame[] = []

  for (const stackLine of lines) {
    const trimmed = stackLine.trim()
    if (!trimmed.startsWith("at ")) continue

    // Parse: "at ComponentName (url:line:col)" or "at ComponentName" or "at div"
    const match = trimmed.match(/^at\s+(\S+)(?:\s+\(([^)]+)\))?$/)
    if (!match) continue

    const callee = match[1]
    const location = match[2]

    // Skip intrinsic HTML elements like "div", "span" (lowercase, no location)
    // These add noise to the component tree
    if (callee === callee.toLowerCase()) continue

    let file = ""
    let line = 0
    let column = 0

    if (location) {
      // Parse location: "http://localhost:5173/src/App.tsx:57:41"
      const locMatch = location.match(/^(.+):(\d+):(\d+)$/)
      if (locMatch) {
        file = locMatch[1]
        line = parseInt(locMatch[2], 10)
        column = parseInt(locMatch[3], 10)
      } else {
        file = location
      }
    }

    // Try to resolve using our source maps (for server components)
    const resolved = resolveFrame(file, line, column, callee)

    // Determine if this is a third-party frame (node_modules)
    const isThirdParty = file.includes("node_modules")

    frames.push({
      callee: resolved.callee || callee,
      file,
      line,
      column,
      sourceLine: resolved.sourceLine,
      thirdParty: isThirdParty,
      isServerComponent: resolved.isServerComponent || false,
      originalFile: resolved.originalFile,
      originalLine: resolved.originalLine,
      originalColumn: resolved.originalColumn,
    })
  }

  return frames
}

/**
 * Filter stack frames to show only relevant ones.
 */
function filterRelevantFrames(frames: StackFrame[]): StackFrame[] {
  return frames.filter((frame) => {
    // Always show server components
    if (frame.isServerComponent) return true

    // Show app source files (src/)
    if (frame.file.includes("/src/")) return true

    // Hide React internals and node_modules
    if (frame.file.includes("node_modules")) return false
    if (frame.file.includes("react-dom")) return false

    // Hide anonymous/unknown frames
    if (frame.file === "unknown" || frame.file === "<anonymous>") return false

    return true
  })
}

export function StackTrace({ error, componentStack }: StackTraceProps) {
  const [frames, setFrames] = useState<StackFrame[]>([])
  const [componentFrames, setComponentFrames] = useState<StackFrame[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const parseStack = async () => {
      try {
        // Parse the error's stack trace
        const stack = new StackTracey(error)

        const parsedFrames: StackFrame[] = stack.items.map((item) => {
          const file = item.file || item.fileName || "unknown"
          const line = item.line || 0
          const column = item.column || 0
          const callee = item.callee || "<anonymous>"

          const resolved = resolveFrame(file, line, column, callee)

          return {
            callee: resolved.callee || callee,
            file,
            line,
            column,
            sourceLine: resolved.sourceLine,
            thirdParty: item.thirdParty || false,
            isServerComponent: resolved.isServerComponent || false,
            originalFile: resolved.originalFile,
            originalLine: resolved.originalLine,
            originalColumn: resolved.originalColumn,
          }
        })

        // Filter to show only relevant frames
        setFrames(filterRelevantFrames(parsedFrames))

        // Parse component stack if available
        if (componentStack) {
          const compFrames = parseComponentStack(componentStack)
          setComponentFrames(compFrames)
        }
      } catch (e) {
        console.error("Failed to parse stack trace:", e)
        setFrames([])
      } finally {
        setLoading(false)
      }
    }

    parseStack()
  }, [error, componentStack])

  if (loading) {
    return <div className="stack-trace-loading">Parsing stack trace...</div>
  }

  if (frames.length === 0 && componentFrames.length === 0) {
    return (
      <div className="stack-trace-empty">
        <pre>{error.stack || "No stack trace available"}</pre>
      </div>
    )
  }

  const renderFrame = (frame: StackFrame, index: number) => {
    const displayFile = frame.originalFile || frame.file
    const displayLine = frame.originalLine || frame.line
    const displayColumn = frame.originalColumn || frame.column

    // Extract just the filename for cleaner display
    let shortFile = displayFile.split("/").pop() || displayFile
    // Remove query strings (like ?t=timestamp from Vite HMR)
    shortFile = shortFile.split("?")[0]

    return (
      <div
        key={index}
        className={`stack-frame ${frame.thirdParty ? "third-party" : ""} ${frame.isServerComponent ? "server-component" : ""}`}
      >
        <div className="stack-frame-header">
          <span className="stack-frame-index">{index + 1}</span>
          <span className="stack-frame-callee">{frame.callee}</span>
          {frame.isServerComponent && <span className="stack-frame-badge">component</span>}
        </div>
        <div className="stack-frame-location">
          <span className="stack-frame-file">{shortFile}</span>
          {displayLine > 0 && <span className="stack-frame-line">:{displayLine}</span>}
          {displayColumn > 0 && <span className="stack-frame-column">:{displayColumn}</span>}
        </div>
        {frame.sourceLine && <pre className="stack-frame-source">{frame.sourceLine}</pre>}
      </div>
    )
  }

  return (
    <div className="stack-trace">
      {/* Error Stack - where the error was thrown */}
      {frames.length > 0 && (
        <div className="stack-section">
          <div className="stack-section-title">Error Location</div>
          {frames.map(renderFrame)}
        </div>
      )}

      {/* Component Tree - React component hierarchy */}
      {componentFrames.length > 0 && (
        <div className="stack-section">
          <div className="stack-section-title">Component Tree</div>
          {componentFrames.map(renderFrame)}
        </div>
      )}
    </div>
  )
}
