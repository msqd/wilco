# Comprehensive Code Review Report

## Review Target

**Branch:** `feat/pre-compile-bundles-v2` vs `main`
**Scope:** 142 files changed, +4285/-1126 lines across 22 commits
**Feature:** Production pre-compilation of wilco component bundles with static file serving

## Executive Summary

The pre-compile bundles feature is **architecturally sound** with clean abstractions (`BridgeHandlers`, `Manifest`, `resolve_build_dir`). The build/manifest/bridge separation is well-designed and the `BridgeHandlers` abstraction successfully shields all four framework bridges from pre-compilation complexity. However, the feature has **security gaps** (path traversal, XSS, undocumented CSP requirement), **test coverage holes** (Django finder and utils entirely untested), and **documentation staleness** (all example READMEs reference removed Makefile targets).

## Findings by Priority

### Critical Issues (P0 - Must Fix Before Merge)

| # | Category | Finding | Location |
|---|----------|---------|----------|
| 1 | Security | Path traversal in `WilcoBundleFinder.find` - strips `wilco/` prefix without containment check | `finders.py:55-58` |
| 2 | Security | Path traversal in `Manifest.get_bundle` - manifest `file` field used as path without validation | `manifest.py:49` |
| 3 | Security | XSS in `wilco_component` template tag - `component_name` interpolated into `mark_safe()` without escaping | `wilco_tags.py:41-44` |
| 4 | Testing | `WilcoBundleFinder` entirely untested (contains path traversal) | `finders.py` |
| 5 | Docs | False claim: "WilcoBundleFinder auto-registered via INSTALLED_APPS" (requires explicit STATICFILES_FINDERS config) | `docs/how-to/django.rst` |

### High Priority (P1 - Fix Before Next Release)

| # | Category | Finding | Location |
|---|----------|---------|----------|
| 6 | Quality | Triplicated build-dir resolution logic in Django (views, utils, finders) | Django bridge |
| 7 | Reliability | `Manifest.get_bundle` crashes on missing files (`FileNotFoundError` unhandled) | `manifest.py:49-50` |
| 8 | Reliability | Build aborts on first component failure, leaves partial output | `build.py:55-60` |
| 9 | Security | `new Function()` requires CSP `unsafe-eval` - undocumented deployment requirement | `standalone.ts:211` |
| 10 | Testing | `get_loader_script_tag` (mode-switching logic) entirely untested | `utils.py` |
| 11 | Testing | No E2E assertions distinguish dev from prod mode (all 60 prod tests pass identically in dev) | E2E specs |
| 12 | CI/CD | CI pipeline does not run E2E tests at all | `.github/workflows/` |
| 13 | CI/CD | 5 of 7 examples: `start-prod` does not depend on `build` | Example Makefiles |

### Medium Priority (P2 - Plan for Next Sprint)

| # | Category | Finding | Location |
|---|----------|---------|----------|
| 14 | Quality | `shutil.rmtree` on output directory without safety check | `build.py:47-48` |
| 15 | Quality | `lru_cache` on `_get_handlers` ignores env var changes (test isolation concern) | `views.py:52` |
| 16 | Performance | Sequential build - no parallelism across components | `build.py:54-60` |
| 17 | Performance | Starlette/FastAPI: blocking sync I/O in async handlers (live-bundling path) | Bridge implementations |
| 18 | Performance | Frontend manifest fetch waterfall (sequential round-trip before first render) | `standalone.ts:413` |
| 19 | Docs | All 6 example READMEs stale (reference `make start`, removed) | `examples/*/README.md` |
| 20 | Docs | ASGI/WSGI READMEs have wrong port numbers | `examples/asgi-minimal/README.md` |
| 21 | Docs | `docs/index.rst` toctree missing CLI reference and 4 explanation pages | `docs/index.rst` |
| 22 | Docs | No migration/upgrade guide for dev-only to production | `docs/` |
| 23 | Practices | esbuild target mismatch: bundler `es2020` vs tsconfig `ES2022` vs loader `esnext` | Build config |
| 24 | Practices | Flask/Starlette prod mode nearly identical to dev (no production WSGI server) | Example Makefiles |
| 25 | Testing | Template tag missing `data-wilco-hash` for cache busting (unlike widget) | `wilco_tags.py:38-47` |

### Low Priority (P3 - Track in Backlog)

| # | Category | Finding | Location |
|---|----------|---------|----------|
| 26 | Quality | `Optional[X]` vs `X | None` inconsistency in `base.py` | `base.py` |
| 27 | Quality | Dead code: `_loader_included` class variable | `widgets.py:47` |
| 28 | Quality | Module-level `app = None` sentinel is dead state | `__main__.py:115` |
| 29 | Docs | `src/wilco/CLAUDE.md` missing new modules in structure | `src/wilco/CLAUDE.md` |
| 30 | Docs | Starlette example missing README entirely | `examples/starlette/` |
| 31 | Practices | `Component` dataclass not frozen (all others are) | `registry.py` |
| 32 | Performance | Manifest JSON written with `indent=2` (unnecessary bytes) | `build.py:73` |
| 33 | CI/CD | No deployment docs or containerization | Repository |
| 34 | CI/CD | E2E runs serially despite independent server ports | Playwright config |

## Findings by Category

- **Code Quality**: 8 findings (0 critical, 1 high, 3 medium, 4 low)
- **Architecture**: 1 finding (0 critical, 0 high, 1 medium, 0 low) - architecture is sound
- **Security**: 4 findings (3 critical, 1 high, 0 medium, 0 low)
- **Performance**: 4 findings (0 critical, 1 high, 3 medium, 0 low)
- **Testing**: 5 findings (2 critical, 2 high, 1 medium, 0 low)
- **Documentation**: 7 findings (1 critical, 0 high, 4 medium, 2 low)
- **Best Practices**: 3 findings (0 critical, 0 high, 2 medium, 1 low)
- **CI/CD & DevOps**: 4 findings (0 critical, 2 high, 1 medium, 1 low)

**Total: 36 findings** (5 Critical, 6 High, 14 Medium, 8 Low + 3 Info)

## Recommended Action Plan

### Immediate (before merge)
1. **Fix path traversal** in `finders.py` and `manifest.py` - add `resolve()` + `is_relative_to()` checks (small)
2. **Fix XSS** in `wilco_tags.py` - HTML-escape `component_name` and `api_base` (small)
3. **Add tests** for `WilcoBundleFinder` including traversal rejection (small)
4. **Fix false docs claim** about auto-registration in `django.rst` (small)
5. **Handle missing files** in `Manifest.get_bundle` - wrap in try/except, return None (small)

### Before next release
6. **Consolidate Django build-dir resolution** into single `resolve_django_build_dir()` (small)
7. **Add tests** for `get_loader_script_tag` and XSS scenarios (small)
8. **Document CSP requirement** in integration guides (small)
9. **Fix example READMEs** - update all 6 to use start-dev/start-prod (medium)
10. **Add E2E mode-specific assertions** - verify bundles load from static (not API) in prod (medium)
11. **Add `make build` dependency** to `start-prod` in Flask/FastAPI/Starlette examples (small)
12. **Add E2E to CI pipeline** (medium)

### Next sprint
13. **Parallel builds** via thread pool in `build_components` (medium)
14. **Build safety check** before `shutil.rmtree` (small)
15. **Fix esbuild target mismatch** across bundler/tsconfig/loader (small)
16. **Fix docs/index.rst toctree** to include all pages (small)

## Review Metadata

- Review date: 2026-03-24
- Phases completed: 1 (Quality+Architecture), 2 (Security+Performance), 3 (Testing+Documentation), 4 (Best Practices+CI/CD), 5 (Final Report)
- Flags applied: none
- Prior simplify passes: 2 (code reuse, quality, efficiency)
- Test suite status: 224 Python tests passing, 120 E2E tests passing
