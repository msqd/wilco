# Test Coverage Analysis

## Current State

- **176 Python tests** across 7 test files
- **8 TypeScript/React test files** covering loader, API hooks, and components
- **19 E2E test files** (Playwright) across 7 framework examples

## Identified Gaps

### 1. Flask Bridge — No Unit Tests (High Priority)

The Flask bridge (`src/wilco/bridges/flask/__init__.py`) has **zero dedicated unit tests**.
Every other bridge (FastAPI, Django, Starlette) has its own test file. The Flask bridge
has the same endpoint patterns with Flask-specific error handling (returning tuples for
status codes) that is completely untested.

**What to test:** `create_blueprint()` endpoints — happy paths, 404s, 422 (invalid names),
500 (bundler failures), cache-control headers.

### 2. Django Template Tags — No Tests (High Priority)

`src/wilco/bridges/django/templatetags/wilco_tags.py` has two template tags
(`wilco_component` and `wilco_loader_script`) with no test coverage. The `wilco_component`
tag does HTML generation with JSON serialization of props — security-sensitive code that
should be tested.

**What to test:** Correct HTML attributes, props JSON encoding, custom `api_base`, special
characters in props, `wilco_loader_script` output.

### 3. Django Views — Partial Coverage (Medium Priority)

`views.py` has `get_registry()` with autodiscovery logic (scanning Django apps for
`components/` directories, reading `WILCO_COMPONENT_SOURCES` settings). The
`get_bundle_result()` and `clear_bundle_cache()` public API functions lack direct tests,
and the `Http404` error paths in `get_bundle` and `get_metadata` views deserve explicit
coverage.

### 4. ServerComponent.tsx — No Tests (Medium Priority)

`src/wilcojs/react/src/loader/ServerComponent.tsx` is a React component wrapping
`useComponent` for use in apps. It has no test file. This is the main public React
component users would import.

**What to test:** Rendering with valid component name, error states, props forwarding,
`window.__MODULES__` setup.

### 5. App.tsx — No Tests (Low Priority)

The main dev UI application (`src/wilcojs/react/src/App.tsx`) has no tests. While this is
a developer tool rather than library code, it contains several non-trivial components:
`ComponentPreview`, `Sidebar`, `BackgroundSelector`, `ErrorFallback`.

**What to test:** Component list rendering, component selection, error boundary behavior.

### 6. `__main__.py` Dev Server — No Tests (Low Priority)

The `create_app()` factory function handles component directory resolution (local
`components/` dir vs packaged examples fallback) with no test coverage.

**What to test:** Default directory resolution, custom `components_dir`, CORS middleware
configuration.

### 7. Bridge Error Handling Consistency (Medium Priority)

The FastAPI bridge returns 422 for `ValueError`, 500 for `RuntimeError`. The Starlette
bridge does the same. But the Django bridge raises `Http404` for both missing components
and bundling failures (swallowing the distinction). The Flask bridge returns JSON error
responses with status tuples. There are no tests that verify **consistent error handling
behavior across bridges**.

**What to test:** A parametrized test ensuring all bridges return equivalent responses for
the same error conditions.

## Recommended Priority Order

1. **Flask bridge unit tests** — Parity with other bridges, straightforward to add
2. **Django template tag tests** — Security-sensitive HTML generation
3. **ServerComponent.tsx tests** — Primary public API for React consumers
4. **Django view error path tests** — `Http404` paths and autodiscovery edge cases
5. **Cross-bridge error consistency tests** — Ensure uniform API behavior
6. **App.tsx / `__main__.py`** — Lower priority, more dev-tooling than library code
