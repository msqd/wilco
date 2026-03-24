# Phase 2: Security & Performance Review

## Security Findings (2A)

### High
1. **FINDING-01: new Function() requires CSP unsafe-eval** (CVSS 8.1, CWE-95) - `standalone.ts:211`. Architectural: the loader uses eval-equivalent to compile bundles. Combined with no integrity verification on fetched bundles, creates a code injection surface if static files are compromised. Remediation: document CSP requirement, add SRI integrity checks using manifest hashes, long-term investigate `<script type="module">` injection.

2. **FINDING-02: Path traversal in WilcoBundleFinder.find** (CVSS 7.5, CWE-22) - `finders.py:55-58`. The `find` method strips `wilco/` prefix and appends to build path without verifying containment. Fix: `resolve()` + `is_relative_to()` check.

3. **FINDING-03: Path traversal in Manifest.get_bundle** (CVSS 7.5, CWE-22) - `manifest.py:49`. The `file` field from manifest.json is used as a path component without containment validation. A tampered manifest could read arbitrary files. Fix: same resolve + containment check.

### Medium
4. **FINDING-05: XSS via unescaped params in Django template tag** - `wilco_tags.py:41-45`. `component_name` and `api_base` interpolated into HTML attributes within `mark_safe()` without escaping.
5. **FINDING-06: No integrity verification on fetched bundles** - `standalone.ts`. Bundles are fetched and executed without comparing against manifest hashes.
6. **FINDING-07: Debug mode in example settings** - Django examples use `SECRET_KEY` with `django-insecure-` prefix.
7. **FINDING-08: CORS allows all origins in dev** - FastAPI example `allow_origins=["*"]` style.

### Low/Informational
8. Build uses `shutil.rmtree` unconditionally
9. Django examples serve media files via `django.views.static.serve` in prod
10. `resolve_build_dir` returns unvalidated path from env var
11. Positive: good existing practices (component name validation, props escaping, content hashing, thread-safe caching)

## Performance Findings (2B)

### High
1. **Sequential build with fail-fast abort** - `build.py:54-60`. Each component bundles sequentially via subprocess. No parallelism. Single failure discards all work. At 50+ components, build time grows linearly.

2. **Manifest.get_bundle() crashes on missing files** - `manifest.py:49-50`. Unhandled `FileNotFoundError` on corrupted deployments. No negative caching, so retries add I/O load.

### Medium
3. **Starlette/FastAPI blocking sync I/O in async handlers** - Live-bundling fallback blocks the event loop via `subprocess.run()` (up to 60s). In production with manifest, impact is low (cached reads).

4. **Frontend manifest fetch waterfall** - `standalone.ts:413-416` awaits manifest before any rendering, adding sequential round-trip. Could inline manifest in HTML.

### Low
5. Build spawns one esbuild per component (could use multi-entry-point)
6. `indent=2` in manifest JSON adds unnecessary bytes
7. Django widget `_loader_script_tag` does filesystem check per render

## Critical Issues for Phase 3 Context

- **Path traversal findings (2A #2, #3)** need test coverage in Phase 3
- **XSS in template tag (2A #4)** needs test for escaped output
- **Missing file handling (2B #2)** needs error-path tests
- **Sequential build (2B #1)** affects CI/CD pipeline design in Phase 4
