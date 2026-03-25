# Architectural review: pre-compile bundles (feat/pre-compile-bundles-v2)

**Reviewer:** Architecture review
**Date:** 2026-03-24
**Scope:** 142 files changed, ~4,300 additions across 22 commits
**Branch:** `feat/pre-compile-bundles-v2` vs `main`

---

## Executive summary

This feature adds production pre-compilation of component bundles, replacing runtime esbuild invocations with static pre-built JavaScript files served directly by the web server. The architecture is well-structured overall: the build/manifest/bridge separation is clean, the `BridgeHandlers` abstraction successfully shields all four framework bridges from pre-compilation details, and the frontend loader's manifest mode is a sound dual-path design. The feature integrates naturally with wilco's existing patterns.

The main architectural concerns are concentrated in two areas: duplicated mode-resolution logic across the Django subsystem, and the inconsistency between how Django bridges and non-Django bridges discover their build directory. The findings below are ordered by severity.

---

## 1. Component boundaries

### 1.1 Build/manifest/bridge separation

**Verdict: Clean.**

The three new core modules form a well-layered pipeline:

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| `build.py` | Orchestrates compilation, writes hashed files + manifest | `bundler`, `registry` |
| `manifest.py` | Reads manifest, caches bundle content, resolves build dir | `bundler.BundleResult` |
| `bridges/base.py` | Consumes manifest via `BridgeHandlers`, exposes `static_mode` | `manifest`, `bundler`, `registry` |

- `build.py` writes; `manifest.py` reads. No circular dependency. Good.
- `manifest.py` exports `resolve_build_dir()` as a pure function. Bridges import and call it independently. Good separation.
- `BridgeHandlers` encapsulates the "try manifest first, fall back to live bundling" strategy in one place. All four bridge implementations delegate to it identically. This is the key architectural win.

### 1.2 Django-specific subsystem

**Verdict: Adequate, with internal duplication (see Finding D-1).**

Django adds three new artifacts beyond the shared `BridgeHandlers`:

- `finders.py` (WilcoBundleFinder) for `collectstatic` integration
- `management/commands/wilco_build.py` for `manage.py wilco_build`
- `utils.py` with `get_loader_script_tag()`

These are all Django-specific concerns and belong under `bridges/django/`. The boundary between "library core" and "Django integration" is respected.

---

## 2. Dependency management

### 2.1 Bridge dependency on abstractions

**Verdict: Good.**

All four bridge factory functions (`create_router`, `create_blueprint`, `create_routes`, and Django's `_get_handlers`) depend on `BridgeHandlers` from `bridges/base.py`, not on `Manifest` or `build.py` directly. The manifest is consumed only through `BridgeHandlers.__init__(build_dir=...)`, which calls `load_manifest()` internally.

This means bridges depend on:
- `ComponentRegistry` (domain)
- `BridgeHandlers` (bridge abstraction)
- `Path | None` for `build_dir` (a primitive)

They do not depend on build tooling, manifest internals, or esbuild. Dependency Inversion is respected.

### 2.2 Frontend loader dependency

**Verdict: Sound.**

`standalone.ts` is self-contained. Its only contract with the backend is:
1. An optional `data-wilco-manifest` attribute on its own script tag
2. The manifest JSON schema: `{ [name]: { file: string, hash: string } }`
3. The existing API contract (`/api/bundles/{name}.js`)

The manifest schema is implicitly shared between `build.py` (producer) and `standalone.ts` (consumer). This is acceptable given the schema's simplicity (two string fields), but see Finding D-3 for a minor improvement opportunity.

---

## 3. API design review

### 3.1 `build_dir` parameter threading

**Verdict: Clean.**

The `build_dir: Path | None` parameter flows simply:

```
Example app
  -> resolve_build_dir(BASE_DIR / "dist" / "wilco")  # returns Path | None
  -> create_router(registry, build_dir=BUILD_DIR)
     -> BridgeHandlers(registry, build_dir=BUILD_DIR)
        -> load_manifest(build_dir) if build_dir else None
```

The parameter is a simple `Path | None`. `None` means "live bundling mode" (the pre-existing behavior). A `Path` means "try manifest first, fall back to live." This is a clear, backwards-compatible extension.

### 3.2 `resolve_build_dir()` function

**Verdict: Well-designed.**

```python
def resolve_build_dir(default_path: Path) -> Path | None:
```

Three-way resolution:
1. `WILCO_BUILD_DIR` env var set to non-empty string: use that path
2. `WILCO_BUILD_DIR` env var set to empty string: explicitly disabled (returns `None`)
3. Env var unset: check `default_path / manifest.json` on disk

The empty-string-means-disabled convention is the key design decision that makes dev-mode override work in E2E tests. It is documented in docstrings and used consistently.

### 3.3 `BridgeHandlers.static_mode` property

**Verdict: Correct and minimal.**

```python
@property
def static_mode(self) -> bool:
    return self._manifest is not None
```

This drives the 404 response on `/api/bundles/{name}.js` in production. The behavior is sound: when bundles are available as static files, the API endpoint should not serve them (avoiding double-serving and ensuring the CDN/static server handles caching). All four bridges check `handlers.static_mode` before attempting live bundling.

---

## 4. Findings

### D-1: Triplicated mode-resolution logic in Django bridge

**Severity:** Medium
**Impact:** Maintainability, correctness risk

The "is this static mode?" decision is computed independently in three places within the Django subsystem, each reimplementing the same env-var + settings + manifest-exists check:

1. **`views.py: _get_handlers()`** (lines 47-62)
2. **`utils.py: get_loader_script_tag()`** (lines 12-30)
3. **`finders.py: WilcoBundleFinder.__init__()`** (reads `WILCO_BUILD_DIR` from settings only)

The first two share identical precedence logic (env var > settings > manifest check), but the third does not check the env var at all. If someone adds a fourth consumer, they must replicate the same logic again.

**Recommendation:** Extract a single `_resolve_django_build_dir() -> Path | None` function in `utils.py` that encapsulates the full precedence chain (env var with empty-string semantics, then Django settings, then manifest existence check). Have `_get_handlers()`, `get_loader_script_tag()`, and `WilcoBundleFinder` all call it.

```python
# utils.py
def resolve_django_build_dir() -> Path | None:
    """Resolve build dir using Django-specific precedence."""
    env_dir = os.environ.get("WILCO_BUILD_DIR")
    if env_dir is not None:
        return Path(env_dir) if env_dir else None
    raw = getattr(settings, "WILCO_BUILD_DIR", None)
    return Path(raw) if raw else None
```

This would also fix the inconsistency where `WilcoBundleFinder` ignores `WILCO_BUILD_DIR=""`.

---

### D-2: Django `_get_handlers()` uses `lru_cache` with mutable env var input

**Severity:** Medium
**Impact:** Correctness in test environments

`_get_handlers()` is decorated with `@lru_cache(maxsize=1)`. Its result depends on `os.environ.get("WILCO_BUILD_DIR")`, which can change between calls (especially in tests using `monkeypatch.setenv`). Once cached, subsequent calls with a different env var value will return the stale handler.

In production, this is fine (the env is set once at startup). In tests or during development with environment changes, the cached value will be incorrect.

**Recommendation:** Either:
- (a) Accept this as a known limitation and document it, since in production the env is static.
- (b) Remove the `lru_cache` from `_get_handlers()` and instead cache the result on the Django `AppConfig` or use a module-level sentinel pattern that can be explicitly reset.

The current approach is acceptable for production use; this is primarily a testing concern. But since `get_registry()` already uses `lru_cache` and the handler creation is cheap (it just calls `load_manifest`), option (a) with a docstring note is sufficient.

---

### D-3: Implicit manifest schema contract between Python and TypeScript

**Severity:** Low
**Impact:** Long-term maintainability

The manifest JSON schema is:
```json
{ "component_name": { "file": "bundles/name.hash.js", "hash": "abc123" } }
```

This schema is implicitly defined by `build.py` (the writer) and consumed by `manifest.py` (the Python reader) and `standalone.ts` (the TypeScript reader). There is no shared schema definition.

**Recommendation:** This is fine at the current complexity level (two string fields). If the manifest schema grows (e.g., adding `integrity` hashes, `dependencies`, or `css` entries), consider adding a JSON schema file at `src/wilco/manifest.schema.json` that both sides can reference. No action needed now.

---

### D-4: `build_components()` does destructive `shutil.rmtree` without safeguard

**Severity:** Low
**Impact:** User safety

```python
if output_dir.exists():
    shutil.rmtree(output_dir)
```

If a user accidentally passes `--output /` or `--output .`, this would delete everything. The current CLI requires `--output` explicitly, which reduces risk, but the `build_components()` function itself has no guard.

**Recommendation:** Add a minimal safety check, for example verifying the output directory contains an existing `manifest.json` before deleting, or requiring the directory to be empty or non-existent:

```python
if output_dir.exists():
    if not (output_dir / "manifest.json").exists() and any(output_dir.iterdir()):
        raise ValueError(f"Refusing to delete non-wilco directory: {output_dir}")
    shutil.rmtree(output_dir)
```

---

### D-5: Non-Django examples do not check `static_mode` for API bundle endpoints

**Severity:** Low
**Impact:** Inconsistency (cosmetic)

In the ASGI and WSGI minimal examples, the raw API handlers (`api_get_bundle`) do not check `bundle_handlers.static_mode` before serving a bundle. In static mode, these endpoints will still serve bundles via the API (reading from the manifest), while the Django, FastAPI, Flask, and Starlette bridges all return 404.

This works correctly (the client in static mode fetches from static URLs, not the API), but it is an inconsistency. A client that falls back to the API in static mode would get different behavior depending on the framework.

**Recommendation:** Add the `static_mode` check to the ASGI and WSGI examples' `api_get_bundle` handlers for consistency:

```python
if bundle_handlers.static_mode:
    return 404, "application/json", json.dumps({"detail": "Bundles are served as static files"}).encode(), {}
```

---

### D-6: `standalone.ts` uses `window` mutation for cross-execution state

**Severity:** Low
**Impact:** Code clarity

```typescript
const _w = window as unknown as {
  __wilcoManifest?: Record<string, ManifestEntry> | null
  __wilcoManifestBaseUrl?: string | null
}
```

This pattern exists to handle browsers executing the deferred script twice when two `<script>` tags reference the same `src`. The commit message (`fix: persist manifest state on window to survive duplicate script execution`) explains the real-world scenario. The solution is pragmatic and correct.

However, the dual storage mechanism (module-level `componentCache` for loaded components vs. `window`-level for manifest data) could confuse future maintainers.

**Recommendation:** Add a brief comment near `componentCache` explaining why it uses a module-level `Map` (survives within a single execution) while the manifest uses `window` (survives across duplicate executions). The current code has the commit-level explanation but not an inline one.

---

### D-7: Django `WilcoBundleFinder` does not respect `WILCO_BUILD_DIR=""` env var

**Severity:** Medium
**Impact:** Dev/prod mode separation in Django

The finder reads `WILCO_BUILD_DIR` only from `settings`:

```python
build_dir = getattr(settings, "WILCO_BUILD_DIR", None)
self._build_path = Path(build_dir) if build_dir else None
```

In the E2E test adapters, dev mode is forced by setting `env: { WILCO_BUILD_DIR: "" }`. This correctly disables `_get_handlers()` and `get_loader_script_tag()`, but the `WilcoBundleFinder` ignores the env var entirely. If the Django settings have `WILCO_BUILD_DIR` pointing to a directory that happens to exist (because `make build` was run previously), `collectstatic` could still copy bundles even in dev mode.

In practice, this is mitigated because `collectstatic` is only run during `make setup` / `make build`, not during `make start-dev`. But the inconsistency is a latent issue.

**This is the same root cause as D-1.** Extracting `resolve_django_build_dir()` and using it in the finder would fix both findings.

---

## 5. Design pattern assessment

### 5.1 Manifest-based static loading in `standalone.ts`

**Verdict: Well-designed.**

The dual-mode loader is a clean implementation of the Strategy pattern at the frontend level:

1. **Initialization:** `detectAndLoadManifest()` checks for `data-wilco-manifest` on its own script tag. If present, fetches the manifest and stores it globally.

2. **Component loading:** `loadComponent()` checks `_w.__wilcoManifest`:
   - Present: build the URL from the manifest's `file` field relative to the manifest URL's directory.
   - Absent: use the existing API mode (`/api/bundles/{name}.js`).

3. **Cache busting:** In manifest mode, the hash is already embedded in the filename (`component.abc123.js`). In API mode, the hash is passed as a query parameter.

The `manifestUrl.replace(/\/manifest\.json$/, "")` derivation of the base URL is simple and effective. It avoids requiring a second data attribute and naturally adapts to any static URL prefix.

The `window`-level persistence of manifest state (D-6) is an acceptable pragmatic solution to a real browser behavior.

### 5.2 Fallback chain in `BridgeHandlers.get_bundle()`

**Verdict: Correct.**

```
manifest.has(name) ? manifest.get_bundle(name)
                   : live_bundle_with_mtime_cache(name)
```

This is a clean Chain of Responsibility. The manifest is checked first (cheap, pre-computed), and live bundling is the fallback. This means:
- In production with a complete manifest, no esbuild invocation ever happens.
- In production with a partial manifest (e.g., new component added), the missing component falls back to live bundling gracefully.
- In dev mode (no manifest), behavior is identical to pre-feature.

### 5.3 Django `collectstatic` integration via `WilcoBundleFinder`

**Verdict: Architecturally appropriate.**

Using Django's `BaseFinder` is the correct integration point. It means:
- `collectstatic` naturally copies pre-built bundles alongside other static files.
- WhiteNoise / nginx / CDN serving of `STATIC_ROOT` just works.
- The `wilco/` prefix ensures no collisions with app static files.

The implementation correctly yields files with paths relative to the storage root, and the `prefix = "wilco"` assignment on the storage ensures proper namespacing.

---

## 6. Architectural consistency with existing wilco patterns

### 6.1 Registry/bridge/bundler separation

The feature respects wilco's existing layering. `build.py` depends on `registry` and `bundler`, the same dependencies as `BridgeHandlers`. It does not introduce new cross-cutting imports.

### 6.2 Bridge factory pattern

All four bridge factories (`create_router`, `create_blueprint`, `create_routes`) received the same `build_dir: Path | None = None` parameter extension. The Django bridge differs by using `_get_handlers()` with settings-based resolution, which is appropriate for Django's configuration model.

### 6.3 Public API surface

The `__init__.py` exports are well-curated:

```python
from .build import BuildResult, build_components
from .manifest import Manifest, load_manifest, resolve_build_dir
```

`BuildResult` and `Manifest` are both frozen dataclass / read-only types. `build_components`, `load_manifest`, and `resolve_build_dir` are pure functions (or nearly so). The API is minimal and focused.

### 6.4 CLI extension

The `wilco build` subcommand follows the existing `wilco serve` pattern. The argparse structure is clean, with `serve` as the implicit default. The `--prefix` flag is a useful addition for multi-source builds.

---

## 7. Cross-cutting concern: dev/prod mode propagation

The mode propagation chain across the full stack:

```
[Build phase]
  Makefile: make build
    -> wilco build --output dist/wilco/ --prefix store
    -> build_components() writes manifest.json + hashed bundles
    -> (Django) collectstatic copies to STATIC_ROOT/wilco/

[Runtime phase - Prod]
  Makefile: make start-prod
    -> App starts, resolve_build_dir() finds dist/wilco/manifest.json
    -> BridgeHandlers(build_dir=Path("dist/wilco"))
    -> handlers.static_mode == True
    -> API bundle endpoint returns 404
    -> Template includes <script src="loader.js" data-wilco-manifest="/static/wilco/manifest.json">
    -> Frontend fetches manifest, loads bundles from /static/wilco/bundles/

[Runtime phase - Dev]
  Makefile: make start-dev
    -> App starts, resolve_build_dir() finds no manifest.json (or WILCO_BUILD_DIR="" in E2E)
    -> BridgeHandlers(build_dir=None)
    -> handlers.static_mode == False
    -> API bundle endpoint serves live-bundled JS
    -> Template includes <script src="loader.js"> (no manifest attribute)
    -> Frontend uses API mode

[E2E testing]
  Adapter: env: { WILCO_BUILD_DIR: "" }
    -> Forces resolve_build_dir() to return None
    -> Guarantees dev mode even if build artifacts exist
```

**Verdict: The propagation chain is sound and well-designed.** The `WILCO_BUILD_DIR=""` override is the critical mechanism that makes E2E testing reliable. The chain has one weak link (D-1/D-7: the Django finder ignoring the env var), but this does not affect runtime behavior, only `collectstatic`.

---

## 8. Summary of findings

| ID | Severity | Category | Summary |
|----|----------|----------|---------|
| D-1 | Medium | Duplication | Mode-resolution logic triplicated in Django bridge (views, utils, finders) |
| D-2 | Medium | Caching | `_get_handlers()` lru_cache ignores env var changes |
| D-3 | Low | Contract | Implicit manifest schema between Python and TypeScript |
| D-4 | Low | Safety | `build_components()` does unconditional rmtree on output dir |
| D-5 | Low | Consistency | ASGI/WSGI examples lack `static_mode` check on API endpoints |
| D-6 | Low | Clarity | `window`-level manifest storage vs module-level component cache needs inline docs |
| D-7 | Medium | Consistency | `WilcoBundleFinder` ignores `WILCO_BUILD_DIR` env var (same root cause as D-1) |

---

## 9. Recommendations (prioritized)

1. **Fix D-1 + D-7 together.** Extract `resolve_django_build_dir()` in `utils.py`. This is the highest-value change: it eliminates duplication and fixes the finder's env var blindness. Estimated effort: small.

2. **Address D-5.** Add the `static_mode` check to ASGI/WSGI examples for consistency. Estimated effort: trivial.

3. **Consider D-4.** Add a safety check before `shutil.rmtree`. Estimated effort: trivial.

4. **Document D-2.** Add a docstring note on the lru_cache limitation. Estimated effort: trivial.

5. **Improve D-6.** Add inline comments explaining the dual-storage rationale in `standalone.ts`. Estimated effort: trivial.

6. **Defer D-3.** No action needed until the manifest schema grows.

---

## 10. Overall assessment

The pre-compile bundles feature is architecturally sound. It follows wilco's existing patterns, introduces clean abstractions (`BuildResult`, `Manifest`, `resolve_build_dir`, `BridgeHandlers.static_mode`), and provides a well-designed dual-mode frontend loader. The `BridgeHandlers` abstraction is the centerpiece, and it successfully shields all four framework bridges from pre-compilation complexity.

The medium-severity findings (D-1, D-2, D-7) are all in the Django subsystem and share a common root cause: the lack of a single source of truth for build-dir resolution within Django. Fixing D-1 addresses D-7 simultaneously and would bring the Django bridge's internal consistency up to the level of the other bridges.

The feature is ready for merge after addressing D-1/D-7 (consolidated mode resolution) and D-5 (ASGI/WSGI static_mode check). The remaining findings are low-severity improvements that can be addressed in follow-up work.
