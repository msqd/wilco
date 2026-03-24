# Review Scope

## Target

All changes on `feat/pre-compile-bundles-v2` branch vs `main`. This branch adds production pre-compilation support for wilco component bundles, including:
- Build system (`build.py`, `manifest.py`, CLI subcommands)
- Static file serving via Django collectstatic finder and framework-specific mounts
- Frontend loader manifest support (`standalone.ts`)
- Bridge modifications for all 4 frameworks (FastAPI, Django, Flask, Starlette)
- E2E test infrastructure for dev/prod modes (14 Playwright projects)
- All 7 example applications updated with start-dev/start-prod targets

## Files

### Core library (src/wilco/)
- `__init__.py` - Public API exports
- `__main__.py` - CLI with build/serve subcommands
- `build.py` - Build orchestration (NEW)
- `manifest.py` - Manifest reader + resolve_build_dir (NEW)
- `bundler.py` - Added minify/sourcemap params
- `bridges/base.py` - BridgeHandlers build_dir + static_mode
- `bridges/django/finders.py` - WilcoBundleFinder for collectstatic (NEW)
- `bridges/django/utils.py` - Shared loader script tag helper (NEW)
- `bridges/django/views.py` - WILCO_BUILD_DIR support
- `bridges/django/widgets.py` - Manifest-aware loader script
- `bridges/django/templatetags/wilco_tags.py` - Manifest-aware loader tag
- `bridges/django/management/commands/wilco_build.py` - Django management command (NEW)
- `bridges/fastapi/__init__.py` - build_dir parameter
- `bridges/flask/__init__.py` - build_dir parameter
- `bridges/starlette/__init__.py` - build_dir parameter

### Frontend (src/wilcojs/)
- `react/src/loader/standalone.ts` - Manifest-based static loading
- `react/vite.config.ts` - Console log filtering for tests

### Tests
- `tests/test_build.py` (NEW)
- `tests/test_manifest.py` (NEW)
- `tests/test_cli.py` (NEW)
- `tests/test_bridges_prebuilt.py` (NEW)
- `tests/test_bridges_django.py` - Updated assertions

### E2E infrastructure (examples/e2e/src/)
- All 7 adapters - dev/prod mode, relative paths, WILCO_BUILD_DIR env
- `fixtures/global.setup.ts` - Parallel setup/build, result reporting
- `fixtures/global.teardown.ts` - Simplified teardown
- `server/ServerManager.ts` - Compact output, verbose mode
- `server/types.ts` - BundleMode type
- `server/index.ts` - Exports

## Flags

- Security Focus: no
- Performance Critical: no
- Strict Mode: no
- Framework: multi-framework (Django, FastAPI, Flask, Starlette)

## Review Phases

1. Code Quality & Architecture
2. Security & Performance
3. Testing & Documentation
4. Best Practices & Standards
5. Consolidated Report
