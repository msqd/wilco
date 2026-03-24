# Phase 1: Code Quality & Architecture Review

## Code Quality Findings (1A)

### High
1. **Duplicated build-dir resolution logic (3 copies)** - `manifest.py:resolve_build_dir`, `views.py:_get_handlers`, `utils.py:get_loader_script_tag` each implement the same env-var + settings + manifest-exists check with subtle differences.

### Medium
2. **Path traversal guard missing in WilcoBundleFinder.find** - `finders.py:49-62` strips `wilco/` prefix and appends to build path without verifying the result stays within the build directory.
3. **Manifest.get_bundle doesn't handle missing bundle files** - `manifest.py:49-50` will raise unhandled `FileNotFoundError` if a referenced file is deleted.
4. **shutil.rmtree without safety check** - `build.py:47-48` deletes the output directory unconditionally. A typo could cause data loss.
5. **Build aborts on first component failure** - `build.py:55-60` leaves a partially-written directory if one component fails to bundle.
6. **Template tag missing hash for cache busting** - `wilco_tags.py:38-47` does not include `data-wilco-hash` unlike the widget.
7. **No test coverage for WilcoBundleFinder** - `finders.py` has no unit tests.
8. **No test coverage for get_loader_script_tag** - `utils.py` has no unit tests.

### Low
9. `Optional[X]` mixed with `X | None` in `base.py`
10. Dead code: `_loader_included` class variable in `widgets.py`
11. Fragile manifest URL derivation via string replace in `standalone.ts`
12. Manifest JSON written with `indent=2` (unnecessary bytes in production)
13. `resolve_build_dir` returns unvalidated path from env var
14. `_get_app` uses mutable global without thread-safety note
15. `wilco_build` management command missing `--prefix` option
16. `new Function()` in loader requires CSP `unsafe-eval` (undocumented)

## Architecture Findings (1B)

### Architecture Assessment: Sound

The build/manifest/bridge separation is clean. `BridgeHandlers` is the correct abstraction point. All four framework bridges delegate identically through `build_dir: Path | None`. The frontend loader's dual-mode (manifest vs API) design is well-structured.

### Medium
1. **D-1/D-7: Triplicated mode-resolution in Django** - `views.py`, `utils.py`, and `finders.py` each independently determine static mode. The finder ignores `WILCO_BUILD_DIR=""` env var, inconsistent with other consumers. **Same root cause as Code Quality #1.**
2. **D-2: lru_cache on _get_handlers ignores env var changes** - Acceptable for production, problematic for tests. Needs documentation.

### Low
3. **D-3: Implicit manifest schema** - No shared schema between Python and TypeScript. Acceptable at current complexity.
4. **D-4: Unsafe rmtree** - Same as Code Quality #4.
5. **D-5: ASGI/WSGI examples lack static_mode check** - API endpoints still serve bundles in static mode (inconsistent with other bridges).
6. **D-6: window-level manifest state needs inline docs** - The dual storage rationale (module-level cache vs window-level manifest) is explained only in commit messages.

## Critical Issues for Phase 2 Context

- **Path traversal in WilcoBundleFinder.find** (security implication for Phase 2A)
- **CSP `unsafe-eval` requirement** (security implication for Phase 2A)
- **Missing error handling in manifest file reads** (reliability concern for Phase 2B)
- **Build abort on first failure** (deployment reliability for Phase 2B)
