# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2] - 2026-03-30

### Fixed

- **Django finders**: `WilcoBundleFinder.find()` now returns `None` instead of `""` when no file matches, fixing Django's `finders.find()` aggregation and whitenoise compatibility (#16)
- **Starlette bridge**: `get_bundle` no longer blocks the event loop during live bundling (uses `asyncio.to_thread`)
- **Starlette bridge**: `get_bundle` now returns HTTP 500 on esbuild failures instead of crashing (parity with FastAPI bridge)

## [0.5.1] - 2026-03-26

### Fixed

- **Standalone loader**: handle hashed manifest filenames (e.g. `manifest.49a00a0d5276.json`) when deriving the bundle base URL, fixing component loading with Django's `CompressedManifestStaticFilesStorage`

## [0.5.0] - 2026-03-25

### Added

- **Pre-compile CLI**: `wilco build` command pre-compiles all registered components
  into content-hashed static JS files with a manifest, eliminating the esbuild
  dependency at runtime in production
- **Django management command**: `manage.py wilco_build` wraps the generic build
  command with Django auto-discovery and outputs to `STATIC_ROOT/wilco/bundles/`
- **Django static finders**: `WilcoBundleFinder` and `WilcoStaticFinder` for serving
  pre-built bundles and wilco static files (loader.js) via Django's staticfiles
- **Manifest reader**: `wilco.manifest` module loads and caches manifest.json for
  bridges to serve pre-built bundles
- **Production mode for all examples**: `make start-prod` builds then serves
  pre-compiled bundles without esbuild; `make start-dev` preserves live bundling
- **Standalone loader static mode**: `loader.js` reads manifest attribute to resolve
  pre-built bundle URLs instead of fetching from the API
- **Admin live preview for FastAPI and Starlette**: inject-based preview with
  automatic form data validation and component prop updates
- **E2E bundle-mode tests**: Shared test verifying both dev and prod bundle serving
  across all 7 example applications
- **E2E admin preview tests**: Shared test verifying admin live preview loads
  components without errors (no `$NaN`, valid price, no console errors)
- **E2E admin link tests**: Shared test verifying the header admin link navigates
  to the admin panel
- **Architecture documentation**: Explanation docs covering architecture overview,
  bundling lifecycle, request lifecycle, and live preview system

### Fixed

- **Admin link trailing slash**: FastAPI, Flask, Starlette examples now use `/admin/`
  instead of `/admin`, preventing redirect failures in some admin frameworks
- **Admin preview on client-side navigation**: FastAPI (SQLAdmin) and Starlette
  (Starlette-Admin) use SPA-style navigation where DOMContentLoaded doesn't re-fire;
  preview now polls until async bundle loading completes before updating props
- **Static route ordering**: ASGI/WSGI minimal examples check `/static/wilco/`
  before `/static/` so pre-built bundles are reachable in prod mode

## [0.4.0] - 2026-02-18

### Added

- **Flask Bridge**: New `wilco.bridges.flask` module for Flask framework integration
  with Blueprint-based API (`create_blueprint`), matching FastAPI/Starlette bridges
- **Flask Example**: Complete example with Flask-Admin and live preview
- **FastAPI Live Preview**: ASGI middleware and JavaScript for real-time component
  preview in SQLAdmin edit/create forms
- **Django Vanilla Example**: Standard Django admin with `LivePreviewAdminMixin`
  (alongside existing Unfold variant)
- **ASGI Minimal Example**: Pure ASGI application for educational/low-dependency use
- **WSGI Minimal Example**: Pure WSGI application for educational/low-dependency use
- **E2E Test Suite**: Playwright-based end-to-end tests for all example applications
- **`STATIC_DIR` export**: `wilco.bridges.base.STATIC_DIR` exposes path to wilco's
  static files (loader.js) for non-Django frameworks
- **`ComponentRegistry.sources` property**: Read-only access to registered sources
- **Flask documentation**: Complete how-to guide for Flask integration
- **HTTP Caching specification**: Documentation for cache control strategy

### Changed

- **Django example renamed** from `django/` to `django-unfold/` to distinguish from
  the new vanilla variant
- **`BridgeHandlers` shared logic**: FastAPI, Django, and Flask bridges now use
  centralized `BridgeHandlers` from `wilco.bridges.base` instead of duplicating
  bundle cache/serving logic
- **Component name validation**: Stricter regex-based validation (alphanumerics,
  underscores, dots, colons only) replacing simple path traversal check
- **Registry `add_source`**: Now warns instead of crashing when source path doesn't
  exist or isn't a directory
- **Symlink handling**: Component discovery uses resolved paths to avoid duplicates
- **Documentation**: All how-to guides updated with correct ports, live preview
  sections, and Flask coverage

## [0.3.0] - 2026-02-08

This release marks a fresh start with a new license model.

### Changed

- **License**: Changed from MIT to Makersquad Source License 1.0
  - Free for non-commercial use
  - Commercial use requires a license
  - Converts to Apache 2.0 after 5 years per version
  - Contact licensing@makersquad.fr for inquiries

### Added

- **Starlette Example**: Complete example with Starlette-Admin and live preview
- **Live Preview for Starlette-Admin**: ASGI middleware and JavaScript for real-time
  component preview in admin forms with resizable sidebar layout
- **Shared Components**: Common store components (product, product_list, product_preview)
  shared between Django and Starlette examples
- **Documentation**: Comprehensive guides for Django, FastAPI, and Starlette integration
  hosted on Read the Docs

### Features (carried from previous versions)

- **Component Registry**: Discover and serve React/TypeScript components from Python
- **Framework Bridges**: Django, FastAPI, and Starlette integrations
- **Standalone Loader**: Self-contained JavaScript loader for server-rendered pages
- **Live Preview**: Real-time component preview in admin interfaces
- **ESM Loading**: Native ES module support with blob URLs
- **Source Maps**: Full debugging support in browser devtools
- **Error Handling**: Typed error classes for better debugging

[Unreleased]: https://github.com/msqd/wilco/compare/0.5.2...HEAD
[0.5.2]: https://github.com/msqd/wilco/compare/0.5.1...0.5.2
[0.5.1]: https://github.com/msqd/wilco/compare/0.5.0...0.5.1
[0.5.0]: https://github.com/msqd/wilco/compare/0.4.0...0.5.0
[0.4.0]: https://github.com/msqd/wilco/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/msqd/wilco/releases/tag/0.3.0
