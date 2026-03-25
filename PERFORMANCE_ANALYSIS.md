# Performance and scalability analysis: pre-compile bundles (v2)

**Branch**: `feat/pre-compile-bundles-v2`
**Date**: 2026-03-24
**Scope**: Build pipeline, runtime serving, manifest handling, frontend loading, Django integration

---

## Executive summary

The pre-compile bundles feature introduces a production deployment path that replaces on-demand esbuild invocations with pre-built static files. The architecture is sound for its current scope, a small-to-medium number of components served by a single process. The findings below identify specific bottlenecks that would surface under scale, ordered from most impactful to least.

---

## Finding 1: Sequential build with fail-fast abort

**Severity**: High
**Files**: `src/wilco/build.py:54-60`
**Path**: `build_components()` iterates `registry.components` sequentially, calling `bundle_component()` (which spawns a subprocess to esbuild) one component at a time.

### Current behavior

```python
for name, component in registry.components.items():
    result = bundle_component(component.ts_path, ...)
```

Each `bundle_component()` call spawns a new esbuild subprocess (`subprocess.run` with 60s timeout), waits for it to complete, reads the output file, computes a SHA-256 hash, then moves on to the next component. For N components, total build time is roughly `N * (esbuild_startup + compile + hash)`.

### Impact

- With 4 example components this is negligible. With 50+ components in a real application, build time grows linearly and could reach several minutes. esbuild itself is fast (sub-second per component), but process spawn overhead on macOS/Linux is 20-50ms per invocation, and the sequential design means zero utilization of multi-core hardware.
- A single component failure aborts the entire build with an unhandled `RuntimeError` propagating from `bundle_component()`. If 49 of 50 components build successfully but the 50th fails, all prior work is discarded because the manifest has not been written yet.

### Recommendation

1. **Parallel builds with `concurrent.futures.ProcessPoolExecutor`**: esbuild processes are CPU-independent (the Python process just waits), so a thread pool of 4-8 workers would provide near-linear speedup. esbuild itself also supports multi-entry-point bundling in a single invocation, which eliminates per-process spawn overhead entirely.
2. **Partial success with error collection**: Accumulate failures in a list, write the manifest for all successful components, then report failures. This allows partial deployments and makes the build more resilient. The build command can still return a non-zero exit code if any component failed.
3. **Incremental builds**: Compare source file hashes against the existing manifest. Skip components whose source hash has not changed. This turns a 50-component rebuild into a 1-component rebuild after a single file edit.


## Finding 2: Manifest.get_bundle() crashes on missing files

**Severity**: High
**Files**: `src/wilco/manifest.py:49-50`
**Path**: `Manifest.get_bundle()` calls `file_path.read_text()` without any error handling.

### Current behavior

```python
file_path = self._build_dir / entry["file"]
code = file_path.read_text()  # raises FileNotFoundError or PermissionError
```

If a bundle file listed in the manifest does not exist on disk (corrupted deploy, partial `collectstatic`, race condition during deployment), this raises an unhandled `FileNotFoundError` that propagates as a 500 Internal Server Error.

### Impact

- In production, a deployment that copies `manifest.json` before all bundle files are in place creates a window where every request for the not-yet-copied component triggers a 500 error. This is a reliability issue, not just a performance issue, but it directly affects perceived performance through error pages.
- The `_bundle_cache` dict does not cache negative results, so every subsequent request for the missing file will retry the filesystem read, adding I/O load under error conditions.

### Recommendation

Wrap the file read in a try/except and return `None` for missing files, consistent with the "not found in manifest" path. Log a warning so operators can detect corrupted deployments:

```python
try:
    code = file_path.read_text()
except (FileNotFoundError, PermissionError):
    return None
```


## Finding 3: Starlette/FastAPI bridges call synchronous I/O in async handlers

**Severity**: Medium
**Files**: `src/wilco/bridges/starlette/__init__.py:67-95`, `src/wilco/bridges/fastapi/__init__.py:48-68`
**Path**: `get_bundle()` in Starlette is declared `async def` but calls `handlers.get_bundle(name)` which performs synchronous file I/O (`Path.read_text()`, `Path.stat()`) and can spawn a subprocess (esbuild) in the fallback path.

### Current behavior

The Starlette bridge declares `async def get_bundle(request)`, but the underlying `BridgeHandlers.get_bundle()` performs:
- `component.ts_path.stat()` (blocking filesystem syscall)
- `file_path.read_text()` in the manifest path (blocking I/O)
- `subprocess.run()` in the live-bundling fallback (blocking for up to 60 seconds)

In an async framework like Starlette or FastAPI with uvicorn, blocking the event loop means all other concurrent requests are stalled while esbuild runs.

### Impact

- In the static/manifest path, the impact is low because `read_text()` on a small cached file is fast and the result is cached after the first call.
- In the live-bundling fallback, a single uncached component request blocks the entire event loop for the duration of the esbuild subprocess (up to 60 seconds). During this time, no other requests can be processed by that worker.
- With uvicorn's default of 1 worker, this means complete request starvation during a live-bundle operation.

### Recommendation

For the manifest path (production), the current approach is acceptable because files are small and reads are cached. For the live-bundling fallback (development), wrap the blocking call with `asyncio.to_thread()`:

```python
result = await asyncio.to_thread(handlers.get_bundle, name)
```

This offloads the blocking I/O to a thread pool, keeping the event loop responsive. Alternatively, document that users should run uvicorn with multiple workers (`--workers 4`) when using the live-bundling path.


## Finding 4: Unbounded in-memory bundle cache

**Severity**: Medium
**Files**: `src/wilco/manifest.py:31`, `src/wilco/bridges/base.py:41-43`
**Path**: Both `Manifest._bundle_cache` and `BundleCache._cache` grow without bound.

### Current behavior

- `Manifest._bundle_cache` stores every bundle's full JavaScript code in memory after first read. There is no eviction, size limit, or TTL.
- `BundleCache._cache` (used for live-bundling) similarly stores every bundled result indefinitely, evicting only on mtime change.
- In Django, `_get_handlers()` is wrapped with `@lru_cache(maxsize=1)`, meaning a single `BridgeHandlers` instance (and its caches) lives for the entire process lifetime.

### Impact

- For a typical deployment with 20-50 components, each bundle being 10-100 KB of minified JavaScript, total memory usage is 0.2-5 MB. This is acceptable.
- For a large deployment with 200+ components and unminified bundles with source maps (common in development), each bundle could be 200+ KB, pushing total cache usage to 40+ MB per worker process. With 8 uvicorn workers, that is 320+ MB of duplicated cache across processes.
- In the Django case, the `lru_cache(maxsize=1)` on `_get_handlers()` means the cache persists across all requests for the lifetime of the process. Combined with Django's common deployment pattern of long-lived gunicorn workers, this memory is never reclaimed.

### Recommendation

For the current scale (dozens of components), this is acceptable and the caching strategy is correct: pre-built bundles are immutable between deployments. For larger deployments:
1. Consider adding a `max_size` parameter to `BundleCache` that evicts least-recently-used entries.
2. For the manifest cache, consider lazy loading only, not eagerly reading all bundles into memory at startup. The current implementation already does this (lazy on first access), which is good.
3. Document the expected memory footprint in deployment guides.


## Finding 5: Frontend manifest fetch is a waterfall bottleneck

**Severity**: Medium
**Files**: `src/wilcojs/react/src/loader/standalone.ts:388-416`
**Path**: `initialize()` calls `await detectAndLoadManifest()` before `initializeComponents()`, creating a sequential waterfall.

### Current behavior

```typescript
async function initialize(): Promise<void> {
  await detectAndLoadManifest()   // 1. Fetch manifest.json
  initializeComponents()           // 2. Then render components
}
```

In static mode, the page initialization sequence is:
1. Browser loads and parses `loader.js`
2. `initialize()` fetches `/static/wilco/manifest.json` (network round-trip)
3. Only after the manifest response, `initializeComponents()` starts
4. Each component then fetches its individual bundle file (more round-trips)

This creates a minimum of 2 sequential network round-trips before any component renders.

### Impact

- On a fast local network, this adds 20-50ms per round-trip, so 40-100ms total before first component paint.
- On a slow mobile connection (3G, 300ms RTT), this becomes 600ms+ before any component renders, which is user-perceptible.
- The individual bundle fetches in step 4 are not parallelized either; `initializeComponents()` calls `renderComponent()` for each container, and each one independently calls `loadComponent()` which fires its own `fetch()`. While these happen concurrently (because they are not awaited sequentially), the browser's connection limit (6 per hostname in HTTP/1.1) can serialize them for pages with many components.

### Recommendation

1. **Inline the manifest**: Since the server already knows the manifest at render time, the Django template tag could inline the manifest data as a JSON blob in the HTML instead of requiring a separate fetch. This eliminates one round-trip entirely:
   ```html
   <script>window.__wilcoManifest = {"counter": {"file": "bundles/counter.abc123.js", "hash": "abc123"}};</script>
   ```
2. **Preload critical bundles**: Add `<link rel="preload" as="script">` tags for components that appear above the fold, so the browser starts fetching them in parallel with the loader script.
3. **HTTP/2 server push or 103 Early Hints**: If the server knows which components a page uses, it can push bundle files or send Early Hints to eliminate the second round-trip as well.


## Finding 6: Per-component esbuild subprocess spawn in build

**Severity**: Medium
**Files**: `src/wilco/bundler.py:292-315`
**Path**: Each `bundle_component()` call creates a temporary file, spawns an esbuild subprocess, reads the output, deletes the temp file, and computes a hash.

### Current behavior

```python
with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as out_file:
    out_path = out_file.name
# ... build cmd ...
result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
# ... read out_path, delete it ...
```

### Impact

- Process spawn overhead: ~20-50ms per invocation on macOS, less on Linux. For 50 components, that is 1-2.5 seconds of pure overhead.
- Temporary file creation and deletion: additional filesystem I/O that is not strictly necessary. esbuild supports `--bundle --outfile=/dev/stdout` (or writing to stdout directly).
- The `_find_esbuild()` function is called every time, though it caches the result in a global variable after first resolution. This is fine.

### Recommendation

1. **Use esbuild's stdin/stdout mode**: Instead of writing to a temp file, pipe the entry point via stdin and read the bundle from stdout. This eliminates temp file I/O.
2. **Use esbuild's multi-entry-point mode**: A single esbuild invocation can bundle multiple entry points. This reduces process spawn overhead from N to 1. The `build_components()` function would need to map entry points to output filenames.
3. **Consider the esbuild JavaScript API**: While spawning the CLI is simple, using esbuild's JavaScript API via a small Node.js script would allow a single long-running process to handle all bundling, eliminating all subprocess overhead.


## Finding 7: Django utils duplicate manifest resolution logic

**Severity**: Low
**Files**: `src/wilco/bridges/django/utils.py:6-30`, `src/wilco/bridges/django/views.py:52-74`
**Path**: Both `get_loader_script_tag()` and `_get_handlers()` independently resolve the build directory and check for a manifest.

### Current behavior

`get_loader_script_tag()` in utils.py:
```python
env_dir = os.environ.get("WILCO_BUILD_DIR")
# ... same resolution logic ...
is_static = build_path is not None and load_manifest(build_path) is not None
```

`_get_handlers()` in views.py:
```python
env_dir = os.environ.get("WILCO_BUILD_DIR")
# ... same resolution logic ...
effective_build_dir = build_path if (build_path and load_manifest(build_path)) else None
```

### Impact

- `load_manifest()` reads and parses `manifest.json` from disk. When both functions are called during a request (which happens on every page that includes a wilco component), the manifest is read and parsed twice.
- The `_get_handlers()` function is cached with `@lru_cache(maxsize=1)`, so it only reads the manifest once per process. But `get_loader_script_tag()` has no caching, so it reads and parses the manifest on every call.
- For typical usage (manifest.json is a few KB), the cost per request is negligible (~0.1ms). But it represents duplicated logic that could drift.

### Recommendation

Extract the build-dir resolution into a single cached function that both `_get_handlers()` and `get_loader_script_tag()` call. The `_get_handlers()` cache already exists; extend it or create a shared `_resolve_effective_build_dir()` function.


## Finding 8: Component metadata reads schema.json on every access

**Severity**: Low
**Files**: `src/wilco/registry.py:53-56`
**Path**: `Component.metadata` is a property that reads and parses `schema.json` from disk on every access.

### Current behavior

```python
@property
def metadata(self) -> dict:
    """Load metadata from schema.json on each access (for dev hot-reload)."""
    return _load_metadata(self.package_dir)
```

`_load_metadata()` opens and parses the JSON file each time. This is intentional for development hot-reload, as noted in the docstring.

### Impact

- In the `BridgeHandlers.get_metadata()` path, this means a filesystem read + JSON parse on every metadata request.
- In the build path, metadata is not accessed, so there is no impact there.
- In production with the manifest, `get_metadata()` still calls `component.metadata` to build the response, which reads schema.json from disk every time. The hash is obtained from the manifest (fast), but the title, description, and props schema come from the filesystem.

### Recommendation

In production mode (when a manifest is loaded), metadata should be cached since the component source files are not changing. One approach: add a `cache_metadata` flag to `ComponentRegistry` or `BridgeHandlers` that, when True, caches the result of `_load_metadata()` after the first read.


## Finding 9: `shutil.rmtree` on build output is destructive during deployment

**Severity**: Low
**Files**: `src/wilco/build.py:47-48`
**Path**: `build_components()` unconditionally deletes the entire output directory before writing.

### Current behavior

```python
if output_dir.exists():
    shutil.rmtree(output_dir)
```

### Impact

- If the output directory is the same directory that the running production server is reading from (e.g., `WILCO_BUILD_DIR` points to the same path), then during the window between `shutil.rmtree` and the final `manifest.json` write, all bundle requests will fail.
- With the manifest-first approach in the serving layer, `Manifest.__init__()` would raise `FileNotFoundError` if the manifest is deleted while the server is reinitializing.
- This is more of a reliability concern than a pure performance issue, but it can cause a burst of 500 errors that impacts user-perceived performance.

### Recommendation

Build into a temporary directory, then atomically swap:
```python
temp_output = output_dir.with_suffix(".tmp")
# ... build everything into temp_output ...
if output_dir.exists():
    shutil.rmtree(output_dir)
output_dir.rename(temp_output, output_dir)  # atomic on same filesystem
```

Or better: build into a timestamped directory and update a symlink. This allows instant rollback.


## Finding 10: No HTTP cache headers for manifest.json on frontend

**Severity**: Low
**Files**: `src/wilcojs/react/src/loader/standalone.ts:398`
**Path**: The frontend fetches `manifest.json` with a plain `fetch()` call, relying entirely on the web server's default caching behavior.

### Current behavior

```typescript
const response = await fetch(manifestUrl)
```

### Impact

- If the web server (nginx, CloudFront, etc.) is configured with aggressive caching for `/static/`, the manifest might be cached for a long time after a deployment, causing the frontend to load stale bundles.
- Conversely, if no caching is configured, the manifest is re-fetched on every page load, adding an unnecessary network round-trip for content that only changes on deployment.
- The bundle files themselves are content-hashed (`counter.abc123def456.js`), so they are safe to cache immutably. But `manifest.json` is not hashed, it is always at the same path.

### Recommendation

1. **Cache-bust the manifest URL**: Include a deployment timestamp or build hash in the manifest URL: `/static/wilco/manifest.json?v=1234567890`. The template tag already has access to the manifest and could derive a hash.
2. **Document cache configuration**: Provide guidance for common web servers on how to set up caching. Recommend `Cache-Control: no-cache` for `manifest.json` (revalidate every time) and `Cache-Control: public, max-age=31536000, immutable` for hashed bundle files.
3. **Use ETags**: The web server can serve manifest.json with an ETag, allowing conditional requests (304 Not Modified) that save bandwidth without risking staleness.


## Finding 11: `componentCache` in frontend never evicts entries

**Severity**: Low
**Files**: `src/wilcojs/react/src/loader/standalone.ts:126`
**Path**: `componentCache` is a `Map<string, Promise<LoadedComponent>>` that caches loaded component promises indefinitely.

### Current behavior

```typescript
const componentCache = new Map<string, Promise<LoadedComponent>>()
```

Components are cached by `cacheKey` (which includes the hash for cache busting). When a new deployment changes a component's hash, the old entry remains in the map and a new entry is created for the new hash.

### Impact

- For single-page applications that persist across deployments (hot-reloading scenarios), the cache grows with each deployment's unique hashes. In practice, this is unlikely to be a problem because page reloads clear the cache.
- The cache stores `Promise<LoadedComponent>`, and each resolved component is a function reference plus its closure. Memory usage per component is small (a few KB for the compiled function).
- The `suspenseCache` (line 38) has the same characteristic but is keyed by component name only, so it is bounded by the number of unique component names.

### Recommendation

This is acceptable for the current design. If long-lived single-page applications become a use case, consider a simple LRU eviction or clearing the cache on a `visibilitychange` event.


## Finding 12: `WilcoBundleFinder.list()` uses `rglob` on every collectstatic

**Severity**: Low
**Files**: `src/wilco/bridges/django/finders.py:64-76`
**Path**: The `list()` method recursively scans the build directory every time it is called.

### Current behavior

```python
def list(self, ignore_patterns):
    for file_path in self._build_path.rglob("*"):
        if not file_path.is_file():
            continue
        relative = str(file_path.relative_to(self._build_path))
        yield relative, self._storage
```

### Impact

- `collectstatic` is a management command run at deployment time, not at request time. The `rglob` call scans the build directory once during collectstatic.
- For a build directory with 50 components (50 JS files + 1 manifest), this is a trivial operation.
- The `find()` method (used at request time for `findstatic`) does a direct path lookup, which is O(1). No performance concern there.

### Recommendation

No action needed. This is already well-designed for its use case. The `find()` method is O(1) for request-time lookups, and `list()` is only called during deployment.


---

## Scalability assessment

### Current design limits

| Dimension | Current behavior | Practical limit |
|---|---|---|
| Component count | Sequential build, per-component subprocess | ~50 components before build time exceeds 30 seconds |
| Bundle size | Full bundle code cached in memory per worker | ~200 components at 100 KB each = 20 MB per worker |
| Concurrent requests | Synchronous I/O in async bridges | Event loop blocked during live-bundling fallback |
| Deployment | Destructive `rmtree` then rebuild | Brief window of 500 errors during deployment |
| Frontend loading | 2 sequential round-trips (manifest then bundles) | Adds 40-600ms depending on network conditions |

### Scaling recommendations by growth stage

**10-30 components** (current): No changes needed. The architecture works well at this scale.

**30-100 components**: Implement parallel builds (Finding 1) and inline manifests (Finding 5). Add error handling for missing files (Finding 2).

**100+ components**: Consider esbuild's multi-entry-point mode (Finding 6), incremental builds (Finding 1), and bounded caching (Finding 4). Evaluate whether the build step should be a separate long-running process rather than a CLI command.

---

## Summary of findings

| # | Finding | Severity | Effort to fix |
|---|---|---|---|
| 1 | Sequential build with fail-fast abort | High | Medium |
| 2 | Manifest.get_bundle() crashes on missing files | High | Low |
| 3 | Sync I/O in async bridges (live-bundling path) | Medium | Low |
| 4 | Unbounded in-memory bundle cache | Medium | Low |
| 5 | Frontend manifest fetch waterfall | Medium | Medium |
| 6 | Per-component subprocess spawn overhead | Medium | High |
| 7 | Duplicate manifest resolution in Django | Low | Low |
| 8 | Metadata reads schema.json on every access | Low | Low |
| 9 | Destructive rmtree during build | Low | Low |
| 10 | No cache strategy for manifest.json | Low | Low |
| 11 | Frontend componentCache never evicts | Low | Trivial |
| 12 | WilcoBundleFinder.list() uses rglob | Low | None needed |

**Recommended priority**: Fix Finding 2 first (low effort, high reliability impact), then Finding 1 (high build-time impact), then Finding 5 (user-perceived performance).
