# Wilco Release Plan: Path to Robustness

> *"Simple is better than complex. Explicit is better than implicit."* - Zen of Python

## Executive Summary

This plan outlines the path from current state (v0.1.5) to a robust release. Based on thorough codebase analysis, we identified **critical gaps in test coverage** and **opportunities for simplification**.

**Current State:**
- Python: ~1,576 SLOC, excellent type hints, good test coverage (~85%)
- JavaScript: ~2,861 SLOC, strict TypeScript, partial test coverage (~50%)
- Total test cases: 356+
- Untested modules: 8 critical files

**Target State:**
- Test coverage: >90% for critical paths
- Zero silent failures
- Explicit error messages
- Simplified public API

---

## Phase 1: Foundation (Critical - Do First)

### 1.1 Remove Dead Code

**Rationale:** *"There should be one-- and preferably only one --obvious way to do it."*

Files to audit and clean:

```
src/wilcojs/react/src/loader/sourceMapRegistry.ts
  - getComponentSources() - exported but never used
  - hasSourceMap() - exported but never used
  - unregisterSourceMap() - exported but never called
```

**Decision needed:** Remove these exports or document their intended use case.

### 1.2 Simplify ESM Loading

**Current complexity:** Two separate code paths for ESM loading:
1. `esm.ts` - Used by React app (blob URL + dynamic import)
2. `standalone.ts` - Uses `new Function()` constructor

**Problem:** Duplicated transformation logic, different error handling.

**Proposed simplification:**
```typescript
// Single transformation function used by both paths
// standalone.ts should import from esm.ts where possible
```

### 1.3 Explicit Error Types

**Current state:** Errors are plain strings/Error objects.

**Proposed:**
```typescript
// wilcojs/react/src/errors.ts
export class ComponentNotFoundError extends Error {
  constructor(public readonly componentName: string) {
    super(`Component not found: ${componentName}`)
    this.name = 'ComponentNotFoundError'
  }
}

export class ExportNotFoundError extends Error {
  constructor(
    public readonly exportName: string,
    public readonly componentName: string,
    public readonly availableExports: string[]
  ) {
    super(`Export "${exportName}" not found in "${componentName}". Available: ${availableExports.join(', ')}`)
    this.name = 'ExportNotFoundError'
  }
}

export class BundleLoadError extends Error {
  constructor(
    public readonly componentName: string,
    public readonly cause: Error
  ) {
    super(`Failed to load bundle for "${componentName}": ${cause.message}`)
    this.name = 'BundleLoadError'
  }
}
```

---

## Phase 2: Test Coverage (Critical)

### 2.1 Priority 1 - Untested Critical Modules

| Module | Lines | Risk | Action |
|--------|-------|------|--------|
| `standalone.ts` | 349 | HIGH | Full test suite needed |
| `sourceMapRegistry.ts` | 151 | MEDIUM | Test or remove unused exports |
| `App.tsx` | 316 | MEDIUM | Integration tests |
| `ServerComponent.tsx` | 39 | LOW | Simple wrapper, quick tests |

### 2.2 Test Plan for `standalone.ts`

```typescript
// standalone.test.ts
describe('standalone loader', () => {
  describe('transformEsmToRuntime', () => {
    it('transforms named imports to window.__MODULES__')
    it('transforms default imports')
    it('transforms namespace imports')
    it('extracts default export name')
    it('removes export statements')
    it('preserves source map comments')
    it('adds sourceURL for debugging')
  })

  describe('compileComponent', () => {
    it('compiles valid component code')
    it('throws on syntax error with helpful message')
    it('includes component name in error')
  })

  describe('loadComponent', () => {
    it('fetches from API and compiles')
    it('caches compiled components')
    it('uses hash for cache busting')
    it('removes from cache on error')
  })

  describe('renderComponent', () => {
    it('renders component into container')
    it('creates React root on first render')
    it('reuses existing root on re-render')
    it('shows error message on failure')
  })

  describe('updateComponentProps', () => {
    it('updates props on rendered component')
    it('returns false if component not loaded')
  })

  describe('initializeComponents', () => {
    it('finds all [data-wilco-component] elements')
    it('parses props from data-wilco-props')
    it('handles invalid JSON gracefully')
  })
})
```

### 2.3 Test Plan for `sourceMapRegistry.ts`

```typescript
// sourceMapRegistry.test.ts
describe('sourceMapRegistry', () => {
  describe('extractInlineSourceMap', () => {
    it('extracts base64 encoded source map')
    it('returns null for missing source map')
    it('handles malformed base64 gracefully')
    it('handles invalid JSON gracefully')
  })

  describe('registerSourceMap', () => {
    it('registers source map for component')
    it('replaces existing registration')
    it('skips components without source maps')
  })

  describe('mapToOriginalPosition', () => {
    it('maps generated position to original')
    it('returns null for unregistered component')
    it('returns null for unmapped position')
  })

  describe('getSourceContent', () => {
    it('retrieves original source content')
    it('returns null for missing source')
  })
})
```

### 2.4 Python Test Gaps

| Module | Status | Action |
|--------|--------|--------|
| `__main__.py` | Untested | Add CLI tests |
| `bridges/django/views.py` | Untested | Add view tests |
| `bridges/django/admin.py` | Untested | Add admin tests |
| `bridges/django/templatetags/` | Untested | Add template tag tests |

---

## Phase 3: Robustness Improvements

### 3.1 Error Handling Audit

**Principle:** *"Errors should never pass silently. Unless explicitly silenced."*

#### Current Silent Failures to Fix:

1. **sourceMapRegistry.ts:37-39** - Silently returns null on parse error
   ```typescript
   // Before
   } catch {
     console.warn("Failed to parse inline source map")
     return null
   }

   // After - explicit about why
   } catch (error) {
     console.warn(`Failed to parse source map for ${componentName}: ${error.message}`)
     return null  // Intentionally silent - source maps are optional
   }
   ```

2. **standalone.ts:323-325** - Silently skips invalid props
   ```typescript
   // Before
   } catch (err) {
     console.error(`Invalid props JSON for component '${componentName}':`, err)
   }

   // After - render error state
   } catch (err) {
     console.error(`Invalid props JSON for component '${componentName}':`, err)
     container.innerHTML = `<div style="color:red">Invalid props JSON</div>`
     return  // Don't attempt render with empty props
   }
   ```

### 3.2 Input Validation

**Add explicit validation at API boundaries:**

```typescript
// useComponent.ts - validate inputs explicitly
export function useComponent(name: string, exportName = "default"): LoadedComponent {
  // Explicit validation
  if (!name || typeof name !== 'string') {
    throw new Error('Component name must be a non-empty string')
  }
  if (name.includes('..') || name.includes('/')) {
    throw new Error('Component name cannot contain path traversal characters')
  }
  // ... rest of implementation
}
```

```python
# registry.py - validate component names
def get(self, name: str) -> Component | None:
    """Get a component by name."""
    if not name or not isinstance(name, str):
        raise ValueError("Component name must be a non-empty string")
    if ".." in name or "/" in name:
        raise ValueError("Component name cannot contain path traversal characters")
    return self._components.get(name)
```

### 3.3 Timeout and Resource Limits

```typescript
// esm.ts - add timeout for blob URL imports
export async function importFromString(
  code: string,
  timeoutMs: number = 5000
): Promise<Record<string, unknown>> {
  const blob = new Blob([code], { type: "text/javascript" })
  const url = URL.createObjectURL(blob)

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Module import timed out')), timeoutMs)
    })

    return await Promise.race([
      dynamicImport(url),
      timeoutPromise
    ]) as Record<string, unknown>
  } finally {
    URL.revokeObjectURL(url)
  }
}
```

---

## Phase 4: API Simplification

### 4.1 Public API Audit

**Current exports from `@wilcojs/react`:**

```typescript
// wilco.ts - current
export { useComponent } from "./useComponent.ts"
```

**This is good - minimal surface area.**

**Standalone exports (standalone.ts) - too many:**
```typescript
export {
  loadComponent,      // Internal
  renderComponent,    // Public
  updateComponentProps, // Public
  useComponent,       // Public (duplicate)
  transformEsmToRuntime // Internal - should not be exported
}
```

**Proposed cleanup:**
```typescript
// standalone.ts - only export what's needed
export {
  renderComponent,
  updateComponentProps,
}
// Remove: loadComponent, transformEsmToRuntime (internal)
// Remove: useComponent (use from wilco.ts instead)
```

### 4.2 Configuration Simplification

**Current:** Configuration scattered across multiple files.

**Proposed:** Single configuration point.

```typescript
// config.ts
export interface WilcoConfig {
  apiBase: string
  cacheTimeout: number
  enableSourceMaps: boolean
  onError?: (error: Error, componentName: string) => void
}

export const defaultConfig: WilcoConfig = {
  apiBase: '/api',
  cacheTimeout: 60000,
  enableSourceMaps: true,
}

let currentConfig = { ...defaultConfig }

export function configure(config: Partial<WilcoConfig>): void {
  currentConfig = { ...currentConfig, ...config }
}

export function getConfig(): WilcoConfig {
  return currentConfig
}
```

---

## Phase 5: Documentation

### 5.1 Code Documentation

**Add JSDoc to all public functions:**

```typescript
/**
 * Load and render a React component dynamically.
 *
 * @param name - Component name (e.g., "counter", "contact")
 * @param exportName - Named export to use (default: "default")
 * @returns The loaded React component
 * @throws {ComponentNotFoundError} If component doesn't exist
 * @throws {ExportNotFoundError} If export doesn't exist in component
 *
 * @example
 * ```tsx
 * function App() {
 *   const Counter = useComponent('counter')
 *   return <Counter initialValue={10} />
 * }
 * ```
 */
export function useComponent(name: string, exportName = "default"): LoadedComponent
```

### 5.2 CHANGELOG.md

Create a changelog following Keep a Changelog format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Native ESM loading via blob URLs (replaces regex-based export parsing)
- Explicit error types for better error handling

### Changed
- Simplified standalone loader API
- Improved error messages with available exports

### Fixed
- Named exports now work correctly (ContactRow issue)
- Source map handling edge cases

### Removed
- Unused exports from sourceMapRegistry
```

---

## Phase 6: Quality Gates

### 6.1 Pre-commit Checks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: python-tests
        name: Python Tests
        entry: uv run pytest
        language: system
        pass_filenames: false

      - id: typescript-tests
        name: TypeScript Tests
        entry: pnpm --filter @wilcojs/react test:run
        language: system
        pass_filenames: false

      - id: typecheck
        name: TypeScript Type Check
        entry: pnpm --filter @wilcojs/react typecheck
        language: system
        pass_filenames: false
```

### 6.2 CI Pipeline Requirements

```yaml
# Minimum requirements for merge
- All tests pass (Python + TypeScript)
- Type checking passes
- Linting passes (ruff + biome)
- No decrease in test coverage
- No new TODO/FIXME comments
```

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Audit and remove dead code from sourceMapRegistry.ts
- [ ] Create explicit error types (errors.ts)
- [ ] Add input validation to useComponent and registry.get()

### Week 2: Test Coverage (Part 1)
- [ ] Write tests for standalone.ts (349 lines)
- [ ] Write tests for sourceMapRegistry.ts (151 lines)
- [ ] Achieve 80% coverage for loader/ directory

### Week 3: Test Coverage (Part 2)
- [ ] Write tests for ServerComponent.tsx
- [ ] Write integration tests for App.tsx
- [ ] Add Django view tests
- [ ] Add Django template tag tests

### Week 4: Polish
- [ ] Add JSDoc to all public functions
- [ ] Create CHANGELOG.md
- [ ] Review and simplify public API
- [ ] Add timeout handling to imports
- [ ] Final audit of error messages

### Week 5: Release Prep
- [ ] Run full test suite
- [ ] Manual testing of all framework bridges
- [ ] Update version to 0.2.0
- [ ] Tag release

---

## Success Criteria

1. **Test Coverage:** >90% for critical paths (loader, bundler, bridges)
2. **Zero Silent Failures:** All errors logged or thrown explicitly
3. **Type Safety:** No `any` types in public API
4. **Documentation:** All public functions have JSDoc
5. **Simplicity:** Minimal public API surface
6. **Explicit:** Clear error messages with context

---

## Appendix: Files by Priority

### Must Test (Critical Path)
1. `standalone.ts` - Django integration
2. `useComponent.ts` - Core hook
3. `esm.ts` - Module loading
4. `bundler.py` - Component bundling
5. `registry.py` - Component discovery

### Should Test (Important)
6. `sourceMapRegistry.ts` - Debugging support
7. `ServerComponent.tsx` - Component wrapper
8. `bridges/django/views.py` - Django views

### Nice to Test (Lower Priority)
9. `App.tsx` - Dev preview UI
10. `bridges/django/admin.py` - Admin integration
11. Example components
