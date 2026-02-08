/**
 * Typed errors for the wilco component loader.
 *
 * These errors provide structured information about failures,
 * making it easier to handle specific error cases programmatically.
 */

/**
 * Thrown when a component cannot be found on the server.
 */
export class ComponentNotFoundError extends Error {
  readonly componentName: string

  constructor(componentName: string) {
    super(`Component not found: "${componentName}"`)
    this.name = "ComponentNotFoundError"
    this.componentName = componentName
  }
}

/**
 * Thrown when a requested export doesn't exist in a component module.
 */
export class ExportNotFoundError extends Error {
  readonly exportName: string
  readonly componentName: string
  readonly availableExports: string[]

  constructor(exportName: string, componentName: string, availableExports: string[]) {
    const available = availableExports.length > 0 ? availableExports.join(", ") : "(none)"
    super(`Export "${exportName}" not found in component "${componentName}". Available exports: ${available}`)
    this.name = "ExportNotFoundError"
    this.exportName = exportName
    this.componentName = componentName
    this.availableExports = availableExports
  }
}

/**
 * Thrown when a component bundle fails to load or compile.
 */
export class BundleLoadError extends Error {
  readonly componentName: string
  override readonly cause: Error

  constructor(componentName: string, cause: Error) {
    super(`Failed to load bundle for "${componentName}": ${cause.message}`)
    this.name = "BundleLoadError"
    this.componentName = componentName
    this.cause = cause
  }
}

/**
 * Thrown when an invalid component name is provided.
 */
export class InvalidComponentNameError extends Error {
  readonly componentName: unknown

  constructor(componentName: unknown, reason: string) {
    const nameStr = typeof componentName === "string" ? `"${componentName}"` : String(componentName)
    super(`Invalid component name ${nameStr}: ${reason}`)
    this.name = "InvalidComponentNameError"
    this.componentName = componentName
  }
}

/**
 * Type guard to check if an error is a wilco-specific error.
 *
 * @param error - The error to check
 * @returns True if the error is a wilco-specific error
 *
 * @example
 * ```tsx
 * try {
 *   const Component = useComponent('counter');
 * } catch (error) {
 *   if (isWilcoError(error)) {
 *     // Handle wilco-specific errors
 *     console.log(error.componentName);
 *   }
 * }
 * ```
 */
export function isWilcoError(
  error: unknown,
): error is ComponentNotFoundError | ExportNotFoundError | BundleLoadError | InvalidComponentNameError {
  if (error === null || error === undefined) {
    return false
  }
  if (!(error instanceof Error)) {
    return false
  }
  return (
    error instanceof ComponentNotFoundError ||
    error instanceof ExportNotFoundError ||
    error instanceof BundleLoadError ||
    error instanceof InvalidComponentNameError
  )
}
