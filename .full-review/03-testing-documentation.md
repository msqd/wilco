# Phase 3: Testing & Documentation Review

## Test Coverage Findings (3A)

### High (Untested security-critical code)
1. **WilcoBundleFinder entirely untested** - `finders.py` has zero tests. Contains path traversal vulnerability.
2. **Path traversal via tampered manifest** - `manifest.py:49` no test for malicious `file` field in manifest.
3. **XSS in wilco_component template tag** - `wilco_tags.py:41-44` interpolates `component_name` into HTML without escaping. No tests.

### Medium (Untested feature code)
4. **get_loader_script_tag untested** - `utils.py` mode-switching logic has no unit tests.
5. **Manifest.get_bundle missing-file path** - No test for `FileNotFoundError` when referenced file deleted.
6. **E2E has no mode-specific assertions** - 60 prod-mode tests pass identically to dev mode. No test verifies bundles come from static (not API).
7. **Manifest._bundle_cache not thread-safe** - No lock, unlike BundleCache in base.py.

### Low
8. Empty-string env var disable path untested in resolve_build_dir
9. build_components partial failure (mid-build error) untested
10. Live preview not covered in E2E
11. waitForTimeout flakiness risk in E2E specs

### Positive
- test_build.py: 15 tests covering happy paths well
- test_manifest.py: 15 tests including caching, get_hash, resolve_build_dir
- test_cli.py: 9 tests covering parser and build invocation
- test_bridges_prebuilt.py: 7 tests covering BridgeHandlers + FastAPI 404

## Documentation Findings (3B)

### High
1. **False claim: WilcoBundleFinder auto-registration** - `docs/how-to/django.rst` claims the finder is auto-registered via INSTALLED_APPS. It is not; explicit STATICFILES_FINDERS config is required.
2. **CSP unsafe-eval undocumented** - The loader uses `new Function()` (eval equivalent). No mention of CSP requirement anywhere in docs. Deployment blocker for security-conscious apps.

### Medium
3. **All example READMEs stale** - Still reference `make start` (removed). Django, Flask, FastAPI, Starlette, ASGI, WSGI examples all affected.
4. **ASGI/WSGI README wrong ports** - ASGI says 8300 (actual 8500), WSGI says 8400 (actual 8600).
5. **Starlette README missing** - Only example without a README.
6. **docs/index.rst toctree gaps** - CLI reference and 4 new explanation pages unreachable from root sidebar.
7. **make start in Flask/Starlette/FastAPI docs** - How-to guides reference removed target.
8. **No migration/upgrade guide** - No single doc explaining how to go from dev-only to production.

### Low
9. `src/wilco/CLAUDE.md` missing build.py, manifest.py, finders.py in structure
10. resolve_build_dir docstring doesn't mention empty-string convention (only inline comment)
