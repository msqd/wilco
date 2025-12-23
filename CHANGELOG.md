# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

### Changed

- **Bundle Hash**: Metadata endpoint now includes content hash for cache busting.
- **Cache Headers**: Bundle responses use `immutable` cache directive for better CDN support.
- **Product Model**: Example Django project now uses `ImageField` instead of URL field for product images.

### Documentation

- Added FastAPI integration guide (`docs/fastapi.rst`)
- Added Django integration guide (`docs/django.rst`)
- Added standalone loader internals documentation (`docs/internals/standalone.rst`)
