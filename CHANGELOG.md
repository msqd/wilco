# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Typed Error Classes**: Explicit error types for better error handling:
  - `ComponentNotFoundError` - when a component doesn't exist on the server
  - `ExportNotFoundError` - when a requested export doesn't exist in a module
  - `BundleLoadError` - when a bundle fails to load or compile
  - `InvalidComponentNameError` - when an invalid component name is provided
- **Native ESM Loading**: Components now use blob URLs with dynamic `import()` for proper ES module export handling
- **Input Validation**: Component names are validated to prevent path traversal attacks
- **FastAPI Example**: Complete ecommerce example with FastAPI backend, SQLAlchemy, SQLAdmin, and React/TypeScript frontend demonstrating wilco integration

### Changed

- **Named Export Resolution**: `useComponent('contact', 'ContactRow')` now correctly returns the named export instead of the default
- **Import Transformation**: Standalone loader correctly handles default imports with `.default` accessor
- **Multi-line Exports**: Export statements spanning multiple lines are now properly handled
- **Error Messages**: Improved with context about available exports when an export is not found
- **Source Map Warnings**: Now include error details for easier debugging

### Fixed

- Named exports in dynamically loaded components now work correctly
- Invalid JSON props in Django containers display an error instead of silently using empty props
- Default imports in standalone loader correctly access the `.default` property

### Removed

- Dead code from `sourceMapRegistry.ts`:
  - `unregisterSourceMap()` - exported but never used
  - `getComponentSources()` - exported but never used
  - `hasSourceMap()` - exported but never used

### Security

- Component name validation prevents path traversal attacks (`..` and `/` characters are rejected)

## [0.1.3] - 2025-12-24

### Added

- **Optional Dependencies**: Install framework-specific dependencies with extras: `pip install wilco[fastapi]`, `pip install wilco[django]`, or both: `pip install wilco[fastapi,django]`. Core package has no required dependencies.

- **Django Admin Live Preview**: New `LivePreviewAdminMixin` enables real-time component preview in Django admin forms. The preview updates automatically when form fields lose focus, showing validation errors or the updated component.
- **Standalone Loader**: Self-contained JavaScript loader (`loader.js`) for rendering wilco components in server-rendered pages without a full React app. Includes React, transforms ESM bundles at runtime, and manages component lifecycle.
- **Live Loader Extension**: Additional `live-loader.js` script that adds live preview functionality to the standalone loader, with debounced validation and error display.
- **Django Template Tags**: `{% wilco_component %}` and `{% wilco_loader_script %}` template tags for embedding components in Django templates.
- **Component Widget**: `WilcoComponentWidget` class for rendering components in Django admin readonly fields.
- **Multi-source Registry**: `ComponentRegistry.add_source()` now supports multiple component directories with optional prefixes.
- **Django App Autodiscovery**: Automatically discovers components from `components/` directories in Django apps, prefixed with the app label (e.g., `store:product`).
- **Bundle Caching**: Django bridge caches bundles in memory with file mtime invalidation.
- **Product Component Modes**: Example product component now supports `list` and `detail` display modes.
- **Product List Component**: New `product_list` component for displaying grids of products.
- **Product Preview Component**: New `product_preview` component showing both list and detail modes for admin preview.
- **Goober CSS-in-JS**: Integrated goober (~1KB) for styled-components-like styling with design tokens.
- **useComponent Hook**: Standalone loader now supports `useComponent()` for dynamic component loading with React Suspense.
- **Client-side Image Preview**: Live preview supports blob URLs for previewing uploaded images before form submission.

### Changed

- **Barrel Pattern**: Example components now use barrel pattern with separate implementation and style files.
- **Component Composition**: ProductList and ProductPreview now use `useComponent("store:product")` instead of inline implementations.

- **Bundle Hash**: Metadata endpoint now includes content hash for cache busting.
- **Cache Headers**: Bundle responses use `immutable` cache directive for better CDN support.
- **Product Model**: Example Django project now uses `ImageField` instead of URL field for product images.

### Documentation

- Added FastAPI integration guide (`docs/fastapi.rst`)
- Added Django integration guide (`docs/django.rst`)
- Added standalone loader internals documentation (`docs/internals/standalone.rst`)
- Added JavaScript architecture overview (`docs/javascripts.rst`)
