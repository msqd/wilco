=======================
JavaScript Architecture
=======================

Overview
========

Wilco's JavaScript layer enables Python backends to serve React components
without requiring a full frontend build pipeline. The architecture consists
of three main parts:

1. **Standalone Loader** (``loader.js``) - Self-contained runtime that renders
   components on any HTML page
2. **Live Loader** (``live-loader.js``) - Extension for Django admin live preview
3. **Component Bundles** - ESM bundles created by esbuild at runtime

All JavaScript assets are pre-built and included in the Python wheel, so users
don't need Node.js installed to use wilco. However, **esbuild is required**
for runtime component bundling.

File structure
==============

.. code-block:: text

    src/
    ├── wilco/bridges/django/static/wilco/
    │   ├── loader.js        # Pre-built standalone loader (~195KB)
    │   └── live-loader.js   # Live preview extension (~9KB)
    └── wilcojs/react/
        └── src/loader/
            └── standalone.ts # TypeScript source for loader.js

The ``loader.js`` file is compiled from ``standalone.ts`` using esbuild. This
happens during package release (via ``make wheel``), not at install time.

Standalone loader
=================

The standalone loader (``loader.js``) is a self-contained IIFE that bundles:

- **React 19** and **ReactDOM** - Full React runtime
- **goober** - Lightweight CSS-in-JS library (~1KB)
- **Error Boundary** - Catches and displays component errors
- **Source Map Support** - Maps errors to original TypeScript

Size: ~195KB minified (includes React)

How it works
------------

1. Waits for ``DOMContentLoaded``
2. Finds elements with ``data-wilco-component`` attribute
3. Fetches component bundle from ``/api/bundles/{name}.js``
4. Transforms ESM imports to use the module registry
5. Executes the bundle and renders the component

Example usage:

.. code-block:: html

    <div
        data-wilco-component="store:product"
        data-wilco-props='{"name": "Widget", "price": 9.99}'
        data-wilco-api="/api"
        data-wilco-hash="abc123">
        Loading...
    </div>
    <script src="/static/wilco/loader.js" defer></script>

Module registry
---------------

Components are bundled with external dependencies (React, goober) that are
provided at runtime via ``window.__MODULES__``:

.. code-block:: javascript

    window.__MODULES__ = {
        "react": React,
        "react/jsx-runtime": ReactJsxRuntime,
        "@wilcojs/react": { useComponent },
        "goober": goober,
    };

This allows components to use standard imports:

.. code-block:: typescript

    import React, { useState } from "react";
    import { styled } from "goober";

useComponent hook
-----------------

The loader provides a ``useComponent`` hook for dynamic component loading
with React Suspense:

.. code-block:: tsx

    import { useComponent } from "@wilcojs/react";

    function ProductList({ products }) {
        const ProductCard = useComponent("store:product");
        return products.map(p => <ProductCard {...p} />);
    }

The hook integrates with React Suspense, so components automatically show
a loading fallback while child components load.

Global API
----------

The loader exposes ``window.wilco`` for programmatic control:

.. code-block:: javascript

    // Load a component
    const Component = await window.wilco.loadComponent("store:product");

    // Render into a container
    await window.wilco.renderComponent(container, "store:product", props);

    // Update props on a mounted component
    window.wilco.updateComponentProps(container, newProps);

Live loader
===========

The live loader (``live-loader.js``) extends the standalone loader for Django
admin integration. It provides live preview that updates as you edit forms.

Features:

- **Debounced Updates** - Waits 300ms after field changes
- **Server Validation** - POSTs form data to validate endpoint
- **Error Display** - Shows validation errors above preview
- **Blob URL Preview** - Shows uploaded images before save

Usage:

.. code-block:: html

    <div
        data-wilco-component="store:product_preview"
        data-wilco-props='{"name": "Widget"}'
        data-wilco-live="true"
        data-wilco-validate-url="/admin/store/product/123/validate_preview/">
    </div>
    <script src="/static/wilco/loader.js" defer></script>
    <script src="/static/wilco/live-loader.js" defer></script>

Image preview
-------------

When users select an image file, the live loader creates a blob URL for
instant preview without uploading:

.. code-block:: javascript

    // Field "image" gets mapped to prop "imageUrl"
    const blobUrl = URL.createObjectURL(file);
    props.imageUrl = blobUrl;

This works transparently with components that accept ``imageUrl`` props.

Building the loader
===================

The loader is pre-built in the wheel, but for development:

.. code-block:: bash

    # Build loader only
    make build-loader

    # Build wheel (includes loader build)
    make wheel

Or directly:

.. code-block:: bash

    cd src/wilcojs/react
    pnpm build:loader

The build command uses esbuild:

.. code-block:: bash

    esbuild src/loader/standalone.ts \
        --bundle \
        --minify \
        --format=iife \
        --outfile=../../wilco/bridges/django/static/wilco/loader.js

Runtime requirements
====================

To **use** wilco components (render on pages):

- No Node.js required
- JavaScript files included in wheel
- Modern browser with ES2020 support

To **create** components (bundle TypeScript at runtime):

- esbuild must be available in PATH
- Or: Node.js with ``npx`` (downloads esbuild on demand)

Install esbuild globally:

.. code-block:: bash

    npm install -g esbuild

Or let wilco use npx to download it automatically.

Component bundles
=================

When a component is requested, wilco's Python bundler:

1. Locates the component's ``index.tsx`` file
2. Runs esbuild with external dependencies
3. Returns ESM bundle with inline source maps

Bundler configuration:

.. code-block:: python

    bundle_component(
        ts_path=Path("components/product/index.tsx"),
        component_name="store:product",
        external_deps=["react", "react-dom", "react/jsx-runtime",
                       "@wilcojs/react", "goober"]
    )

External dependencies are resolved via the module registry at runtime.

See also
========

- :doc:`internals/standalone` - Detailed loader internals
- :doc:`django` - Django integration guide
- :doc:`fastapi` - FastAPI integration guide
