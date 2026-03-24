=================
Request Lifecycle
=================

This document traces the complete lifecycle of a component request, from the
HTML data attribute to a rendered React component in the browser. Two paths
are covered: API mode (development) and static mode (production).

API mode (development)
======================

In development, components are bundled on-the-fly by esbuild when first
requested.

.. mermaid::

   sequenceDiagram
       participant HTML as HTML Page
       participant Loader as loader.js
       participant API as Python Bridge
       participant Cache as BundleCache
       participant ESBuild as esbuild

       HTML->>Loader: DOMContentLoaded
       Loader->>Loader: Find [data-wilco-component] elements
       Loader->>API: GET /api/bundles/counter.js?v=abc123
       API->>Cache: Check cache (name + mtime)
       alt Cache hit
           Cache-->>API: BundleResult
       else Cache miss
           API->>ESBuild: Bundle index.tsx
           ESBuild-->>API: ESM code + source map
           API->>Cache: Store (name, result, mtime)
       end
       API-->>Loader: JavaScript (Cache-Control: immutable)
       Loader->>Loader: transformEsmToRuntime(code)
       Loader->>Loader: new Function(transformed)()
       Loader->>HTML: createRoot(container).render(<Component />)

Step-by-step breakdown
----------------------

**1. DOM discovery**

When ``loader.js`` is loaded (with ``defer``), it waits for ``DOMContentLoaded``
and then scans the page for elements with the ``data-wilco-component`` attribute:

.. code-block:: html

    <div data-wilco-component="counter"
         data-wilco-props='{"initialValue": 10}'
         data-wilco-api="/api"
         data-wilco-hash="abc123">
        Loading...
    </div>

**2. Bundle fetch**

For each discovered element, the loader calls ``loadComponent(name, apiBase, hash)``.
The fetch URL is constructed as ``{apiBase}/bundles/{name}.js?v={hash}``.

If the same component is requested by multiple containers, the loader caches
the **Promise** itself (not just the result), so only one network request is
made.

**3. Python bridge processing**

The bridge's ``get_bundle(name)`` method:

1. Checks the **manifest** first (if ``build_dir`` was provided)
2. Looks up the component in the **registry**
3. Reads the source file's **mtime** (modification time)
4. Checks the **BundleCache** with that mtime
5. On cache miss: calls ``bundle_component()`` which runs esbuild
6. Stores the result in cache with the current mtime

**4. ESM transformation**

The browser receives ESM code that cannot run directly (browsers don't support
bare module specifiers like ``import { useState } from "react"``). The loader's
``transformEsmToRuntime`` function rewrites it:

.. code-block:: javascript

    // Input (from esbuild)
    import { useState, useEffect } from "react";
    import { useComponent } from "@wilcojs/react";
    var Counter = function({ initialValue }) { /* ... */ };
    export { Counter as default };

    // Output (after transformation)
    const { useState, useEffect } = window.__MODULES__["react"];
    const { useComponent } = window.__MODULES__["@wilcojs/react"];
    var Counter = function({ initialValue }) { /* ... */ };
    return Counter;

The transformation handles four import patterns:

.. list-table::
   :widths: 50 50
   :header-rows: 1

   * - ESM syntax
     - Transformed to
   * - ``import { a, b } from "mod"``
     - ``const { a, b } = window.__MODULES__["mod"]``
   * - ``import Default from "mod"``
     - ``const Default = window.__MODULES__["mod"].default || window.__MODULES__["mod"]``
   * - ``import * as Mod from "mod"``
     - ``const Mod = window.__MODULES__["mod"]``
   * - ``export { X as default }``
     - ``return X`` (at end of function body)

Source map comments (``//# sourceMappingURL=...``) are preserved through the
transformation and reattached at the end.

**5. Component execution and rendering**

The transformed code is executed via ``new Function(code)()``, which returns the
default-exported React component. The loader then:

1. Creates a React root with ``createRoot(container)``
2. Wraps the component in a ``SuspenseWrapper`` (to support ``useComponent``
   calls inside the component)
3. Wraps in an ``ErrorBoundary`` (to catch render errors)
4. Renders with the parsed props from ``data-wilco-props``

Static mode (production)
========================

In production, pre-built bundles are served as static files. The API is not
involved in bundle delivery.

.. mermaid::

   sequenceDiagram
       participant HTML as HTML Page
       participant Loader as loader.js
       participant Manifest as window.staticManifest
       participant Static as Static Server

       HTML->>Loader: DOMContentLoaded
       Loader->>Loader: Find [data-wilco-component] elements
       Loader->>Manifest: Look up "counter"
       Manifest-->>Loader: {file: "bundles/counter.a1b2c3.js", hash: "a1b2c3"}
       Loader->>Static: GET /static/wilco/bundles/counter.a1b2c3.js
       Static-->>Loader: JavaScript (Cache-Control: immutable)
       Loader->>Loader: transformEsmToRuntime(code)
       Loader->>Loader: new Function(transformed)()
       Loader->>HTML: createRoot(container).render(<Component />)

How static mode activates
-------------------------

The server-rendered HTML includes manifest data that the loader detects:

.. code-block:: html

    <script>
    window.staticManifest = {"counter": {"file": "bundles/counter.a1b2.js", "hash": "a1b2"}};
    window.staticManifestBaseUrl = "/static/wilco/";
    </script>
    <script src="/static/wilco/loader.js" defer></script>

In Django, the ``{% wilco_loader_script %}`` template tag generates this
automatically when ``WILCO_BUILD_DIR`` is configured.

When ``window.staticManifest`` exists, the loader:

1. Looks up the component name in the manifest
2. Fetches from ``{staticManifestBaseUrl}{file}`` instead of the API
3. Falls back to API mode if the component is not in the manifest

This fallback allows incremental adoption: pre-build some components while
others are still bundled at runtime.

Manifest persistence
--------------------

The manifest variables are stored on the ``window`` object rather than as
module-level variables inside the IIFE. This ensures they survive when
``loader.js`` is included multiple times on the same page (e.g., once from a
template, once from an admin widget). Each IIFE execution uses a guard pattern:

.. code-block:: javascript

    window.staticManifest = window.staticManifest || null;
    window.staticManifestBaseUrl = window.staticManifestBaseUrl || "";

Error handling
==============

Errors can occur at every step of the lifecycle. Here's what happens at each
failure point:

.. list-table::
   :widths: 25 35 40
   :header-rows: 1

   * - Failure point
     - Error type
     - User-visible result
   * - Invalid ``data-wilco-props`` JSON
     - JSON parse error
     - Error logged to console, error message rendered in container
   * - Component not in registry
     - HTTP 404
     - "Failed to load component: {name}" rendered in container (red text)
   * - esbuild not found
     - ``BundlerNotFoundError``
     - HTTP 500, error logged server-side
   * - esbuild compilation fails
     - ``RuntimeError``
     - HTTP 500, esbuild stderr logged server-side
   * - Network error (fetch fails)
     - ``TypeError``
     - "Failed to load component: {name}" rendered in container
   * - ESM transform fails
     - Compilation error
     - ``console.error`` with details, error rendered in container
   * - Component throws during render
     - React render error
     - Caught by ``ErrorBoundary``, error message displayed
   * - ``useComponent`` target missing
     - Suspense + HTTP 404
     - Error propagates to nearest ``ErrorBoundary``

Multi-component pages
=====================

When a page contains multiple wilco components:

.. mermaid::

   sequenceDiagram
       participant Page as HTML Page
       participant Loader as loader.js
       participant API as API / Static

       Page->>Loader: DOMContentLoaded
       Note over Loader: Found 3 containers:<br/>counter, product, counter

       par Parallel fetches
           Loader->>API: GET counter.js
           Loader->>API: GET product.js
       end
       Note over Loader: counter fetched once<br/>(promise deduplication)

       API-->>Loader: counter bundle
       API-->>Loader: product bundle

       Loader->>Page: Render counter (container 1)
       Loader->>Page: Render product (container 2)
       Loader->>Page: Render counter (container 3, reuses cached bundle)

All components share:

- A single React instance (from ``window.__MODULES__["react"]``)
- The same module registry
- The same bundle cache (loaded components are never re-fetched)

Each component gets its own ``createRoot()`` call and independent React tree.

See also
========

- :doc:`architecture` — high-level system overview
- :doc:`bundling` — esbuild configuration and source map details
- :doc:`/reference/javascript` — JavaScript API reference
- :doc:`/specs/http-caching` — caching specification
