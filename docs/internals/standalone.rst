=================
Standalone Loader
=================

.. contents:: Table of Contents
   :local:
   :depth: 2

Overview
========

The standalone loader is a self-contained JavaScript bundle that can render
wilco components in any HTML page without requiring a full React application.
It's used by the Django integration for server-side rendered pages.

The loader:

1. Bundles React and ReactDOM
2. Provides a module registry for component dependencies
3. Transforms ESM bundles for runtime execution
4. Manages component lifecycle (mounting, updating, unmounting)

How It Works
============

Data Attributes
---------------

Components are defined using HTML data attributes:

.. code-block:: html

    <div
        data-wilco-component="store:product"
        data-wilco-props='{"name": "Widget", "price": 9.99}'
        data-wilco-api="/api"
        data-wilco-hash="abc123">
        Loading...
    </div>
    <script src="/static/wilco/loader.js" defer></script>

Required attributes:

``data-wilco-component``
    Component name (e.g., ``store:product``, ``counter``)

``data-wilco-props``
    JSON-encoded props object

Optional attributes:

``data-wilco-api``
    Base URL for the component API (default: ``/api``)

``data-wilco-hash``
    Content hash for cache busting. When provided, the loader appends
    it as a query parameter to the bundle URL.

Initialization Flow
-------------------

1. **DOM Ready**: Loader waits for DOMContentLoaded
2. **Discovery**: Finds all ``[data-wilco-component]`` elements
3. **Fetch**: Loads bundle from ``{api}/bundles/{name}.js``
4. **Transform**: Converts ESM imports to runtime registry lookups
5. **Compile**: Executes transformed code via ``new Function()``
6. **Render**: Creates React root and renders component

Module Registry
===============

The loader provides a global module registry that component bundles use:

.. code-block:: javascript

    window.__MODULES__ = {
        "react": React,
        "react/jsx-runtime": ReactJsxRuntime,
    };

When esbuild bundles a component, it marks React as external:

.. code-block:: javascript

    // Original component code
    import { useState } from 'react';

    // Bundled (ESM with externals)
    import { useState } from 'react';
    export { MyComponent as default };

The loader transforms this at runtime:

.. code-block:: javascript

    // Transformed for execution
    const { useState } = window.__MODULES__["react"];
    return MyComponent;

ESM Transformation
==================

The ``transformEsmToRuntime`` function converts ESM syntax:

**Import statements:**

.. code-block:: javascript

    // Before
    import { useState, useEffect } from 'react';
    import * as React from 'react';
    import Component from './Component';

    // After
    const { useState, useEffect } = window.__MODULES__["react"];
    const React = window.__MODULES__["react"];
    const Component = window.__MODULES__["./Component"];

**Export statements:**

.. code-block:: javascript

    // Before
    export { MyComponent as default };

    // After
    return MyComponent;

**Source maps:**

The transformation preserves source maps by extracting and reattaching
the ``//# sourceMappingURL`` comment. It also adds a ``//# sourceURL``
for debugging:

.. code-block:: javascript

    //# sourceURL=components://bundles/store:product.js
    //# sourceMappingURL=data:application/json;base64,...

Global API
==========

The loader exposes a ``window.wilco`` API for programmatic control:

.. code-block:: javascript

    window.wilco = {
        renderComponent,
        loadComponent,
        updateComponentProps,
    };

``loadComponent(name, apiBase, hash)``
--------------------------------------

Load a component bundle by name.

.. code-block:: javascript

    const Component = await window.wilco.loadComponent(
        "store:product",
        "/api",
        "abc123"
    );

Returns a Promise that resolves to the React component function.

Components are cached by ``name`` or ``name?hash`` if a hash is provided.
The promise itself is cached to prevent duplicate fetches when multiple
containers request the same component simultaneously.

``renderComponent(container, name, props, apiBase, hash)``
----------------------------------------------------------

Render a component into a container element.

.. code-block:: javascript

    const container = document.getElementById("my-component");
    await window.wilco.renderComponent(
        container,
        "store:product",
        { name: "Widget", price: 9.99 },
        "/api",
        "abc123"
    );

The container element is enhanced with internal references:

- ``_wilcoRoot``: React root instance
- ``_wilcoComponent``: Loaded component function
- ``_wilcoProps``: Current props

``updateComponentProps(container, newProps)``
---------------------------------------------

Update props on an already-rendered component.

.. code-block:: javascript

    window.wilco.updateComponentProps(container, {
        name: "New Name",
        price: 19.99,
    });

Returns ``true`` if successful, ``false`` if component not yet loaded.

Live Preview Extension
======================

The ``live-loader.js`` script extends the standalone loader with live
preview functionality for Django admin forms.

Enabling Live Preview
---------------------

Add additional data attributes:

.. code-block:: html

    <div
        data-wilco-component="store:product"
        data-wilco-props='{"name": "Widget"}'
        data-wilco-live="true"
        data-wilco-validate-url="/admin/store/product/123/validate_preview/">
    </div>
    <script src="/static/wilco/loader.js" defer></script>
    <script src="/static/wilco/live-loader.js" defer></script>

How Live Preview Works
----------------------

1. **Event Listening**: Listens for ``blur`` events on form fields
2. **Debouncing**: Waits 300ms after last field change
3. **Validation**: POSTs form data to ``validate_url``
4. **Response Handling**:

   - Success: Updates component with new props
   - Failure: Shows validation errors above preview

Extended API
------------

Live preview adds functions to ``window.wilco``:

``validateAndUpdate(container)``
    Trigger validation and update for a container.

``showValidationError(container, errors)``
    Display validation errors above the preview.

``clearValidationError(container)``
    Remove validation error display.

Building the Loader
===================

The standalone loader is built as part of the frontend build process:

.. code-block:: bash

    cd src/wilcojs/react
    pnpm build:loader

This creates ``dist/loader.js`` which should be copied to
``src/wilco/bridges/django/static/wilco/loader.js``.

The build configuration in ``vite.config.ts``:

.. code-block:: typescript

    {
        build: {
            lib: {
                entry: "./src/loader/standalone.ts",
                name: "wilco",
                fileName: "loader",
                formats: ["iife"],
            },
            rollupOptions: {
                output: {
                    inlineDynamicImports: true,
                },
            },
        },
    }

The IIFE format ensures the loader is self-contained and doesn't pollute
the global namespace (except for ``window.__MODULES__`` and ``window.wilco``).

Error Handling
==============

Component Load Errors
---------------------

If a component fails to load, the container displays an error:

.. code-block:: html

    <div style="color: red; padding: 1rem;">
        Failed to load component: store:product
    </div>

Errors are also logged to the console with full details.

Compilation Errors
------------------

If the transformed code fails to compile, the error is logged:

.. code-block:: javascript

    console.error("Failed to compile component 'store:product':", error);

Invalid Props JSON
------------------

If ``data-wilco-props`` contains invalid JSON, the error is logged and
the component renders with empty props.

Debugging
=========

Source Maps
-----------

Component bundles include inline source maps. In browser DevTools, you can:

1. View original TypeScript source in the Sources panel
2. Set breakpoints in original code
3. See mapped stack traces in errors

The sourceURL comment helps identify component sources:

.. code-block:: text

    components://bundles/store:product.js

Performance Considerations
--------------------------

- **Caching**: Bundles are cached with long ``Cache-Control`` headers
- **Deduplication**: Concurrent requests for the same component share one fetch
- **Lazy Loading**: Components load on-demand when containers appear
- **React Reuse**: Single React instance shared across all components

For optimal performance:

1. Use ``data-wilco-hash`` for cache busting
2. Pre-load critical components using ``window.wilco.loadComponent()``
3. Consider server-side rendering for above-the-fold content
