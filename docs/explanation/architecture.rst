=====================
System Architecture
=====================

This document explains the high-level architecture of wilco: how Python backends
serve React components, how framework bridges work, and how the system operates
in development and production modes.

Overview
========

Wilco bridges the gap between Python backends and React frontends. Instead of
building a separate SPA, you define components alongside your Python code, and
wilco handles bundling, serving, and rendering them.

.. mermaid::

   graph LR
       subgraph Python Backend
           A[Component Registry] --> B[Bridge Handlers]
           B --> C[esbuild Bundler]
           B --> D[Manifest Reader]
       end

       subgraph Browser
           E[loader.js] --> F[ESM Transform]
           F --> G[React Render]
       end

       B -- "JS bundle" --> E
       D -- "Static files" --> E

       style A fill:#e0e7ff,stroke:#4f46e5
       style E fill:#fef3c7,stroke:#d97706

The system has three layers:

1. **Python layer** — discovers components, bundles them with esbuild, serves
   them via framework-specific bridges
2. **Transport layer** — HTTP API endpoints (development) or static files (production)
3. **Browser layer** — ``loader.js`` fetches bundles, transforms ESM imports,
   renders React components into the DOM

Component system
================

Components are directories containing a TypeScript entry point:

.. code-block:: text

    components/
    ├── counter/
    │   ├── index.tsx        ← Required: default export
    │   └── schema.json      ← Optional: metadata + props schema
    ├── ui/
    │   └── button/
    │       ├── index.tsx
    │       ├── Button.tsx    ← Internal files bundled together
    │       └── styles.ts
    └── store/
        └── product/
            ├── index.tsx
            └── schema.json

Discovery and naming
--------------------

The ``ComponentRegistry`` scans directories for ``index.tsx`` (or ``index.ts``)
files. Component names are derived from the filesystem path:

.. mermaid::

   graph TD
       A["components/ui/button/index.tsx"] --> B["ui.button"]
       C["components/counter/index.tsx"] --> D["counter"]
       E["myapp/components/product/index.tsx"] --> F["myapp:product"]

       style B fill:#d1fae5,stroke:#059669
       style D fill:#d1fae5,stroke:#059669
       style F fill:#d1fae5,stroke:#059669

- Directory separators become dots: ``ui/button`` → ``ui.button``
- Source prefixes become colons: prefix ``myapp`` + ``product`` → ``myapp:product``
- Django auto-discovery uses the app label as prefix

Multiple sources can be registered with different prefixes:

.. code-block:: python

    registry = ComponentRegistry()
    registry.add_source(Path("./shared"), prefix="")        # → "button"
    registry.add_source(Path("./store/components"), prefix="store")  # → "store:product"

Bridge pattern
==============

All framework integrations share a common ``BridgeHandlers`` class that provides
the core logic. Framework-specific bridges are thin wrappers:

.. mermaid::

   graph TD
       A[BridgeHandlers] --> B[FastAPI Router]
       A --> C[Django Views]
       A --> D[Flask Blueprint]
       A --> E[Starlette Routes]
       A --> F[BundleCache]
       A --> G[Manifest Reader]

       style A fill:#e0e7ff,stroke:#4f46e5
       style F fill:#fef3c7,stroke:#d97706
       style G fill:#fef3c7,stroke:#d97706

``BridgeHandlers`` provides three operations:

- ``list_bundles()`` — returns available component names
- ``get_bundle(name)`` — returns bundled JavaScript (from manifest or live bundling)
- ``get_metadata(name)`` — returns component schema and content hash

These map to three HTTP endpoints exposed by every bridge:

.. list-table::
   :widths: 40 60
   :header-rows: 1

   * - Endpoint
     - Handler method
   * - ``GET /api/bundles``
     - ``list_bundles()``
   * - ``GET /api/bundles/{name}.js``
     - ``get_bundle(name)``
   * - ``GET /api/bundles/{name}/metadata``
     - ``get_metadata(name)``

Deployment modes
================

Wilco operates in two modes, depending on whether pre-built bundles are available.

.. mermaid::

   graph TB
       subgraph "Development Mode (API)"
           A1[Browser] -->|"fetch /api/bundles/name.js"| B1[Python Bridge]
           B1 -->|"bundle on-the-fly"| C1[esbuild]
           C1 -->|"ESM + source maps"| B1
           B1 -->|"JS response"| A1
       end

       subgraph "Production Mode (Static)"
           A2[Browser] -->|"fetch /static/wilco/bundles/name.hash.js"| B2[Static Server]
           B2 -->|"pre-built JS"| A2
       end

       style C1 fill:#fef3c7,stroke:#d97706
       style B2 fill:#d1fae5,stroke:#059669

Development mode
----------------

Components are bundled on-the-fly when requested:

1. Browser requests ``/api/bundles/counter.js``
2. Bridge looks up ``counter`` in the registry
3. Checks the ``BundleCache`` (mtime-based invalidation)
4. If cache miss: runs esbuild to bundle the component
5. Returns JavaScript with ``Cache-Control: immutable`` headers
6. Browser uses the hash query parameter for cache busting

The mtime-based cache means editing a source file instantly invalidates the
cache on the next request, without restarting the server.

Production mode
---------------

Components are pre-compiled with ``wilco build``:

1. All components are bundled and written to ``bundles/{name}.{hash}.js``
2. A ``manifest.json`` maps names to files and hashes
3. Static file server (WhiteNoise, nginx, CDN) serves the bundles
4. The loader reads the manifest and fetches bundles from static URLs
5. The API endpoint returns 404 (``static_mode = True``)

The content hash in filenames makes immutable caching safe: when a component
changes, the build produces a new filename.

Module registry
===============

Components are bundled with React, ReactDOM, goober, and ``@wilcojs/react``
marked as **external** dependencies. These are provided at runtime via a global
module registry:

.. code-block:: javascript

    window.__MODULES__ = {
        "react": React,
        "react/jsx-runtime": ReactJsxRuntime,
        "react-dom/client": ReactDOMClient,
        "@wilcojs/react": { useComponent },
        "goober": goober,
    };

This means:

- **All components share a single React instance** — no version conflicts, smaller
  bundles, consistent behavior
- **Components can import from the registry** using standard ``import`` syntax
- **Arbitrary npm packages are not available** — only the modules in the registry
  can be imported. If a component needs a library, it must be bundled with the
  component (not marked as external)

The ESM transformation (``transformEsmToRuntime``) rewrites imports at load time:

.. code-block:: javascript

    // Original (from esbuild)
    import { useState } from "react";

    // Transformed (by loader.js)
    const { useState } = window.__MODULES__["react"];

See :doc:`request-lifecycle` for the full transformation details.

Caching strategy
================

Wilco uses a multi-layer caching strategy:

.. list-table::
   :widths: 20 30 50
   :header-rows: 1

   * - Layer
     - Mechanism
     - Behavior
   * - **Python (dev)**
     - ``BundleCache`` with mtime
     - Invalidates when source file is modified. No restart needed.
   * - **Python (prod)**
     - ``Manifest`` with in-memory cache
     - Reads bundle file once, caches forever (files are immutable).
   * - **HTTP**
     - ``Cache-Control: immutable``
     - Browser caches for 1 year. Hash-based URLs bust the cache.
   * - **Browser**
     - Promise deduplication
     - Multiple containers requesting the same component share one fetch.

The promise-based deduplication is important for pages with multiple instances
of the same component: the loader caches the ``Promise`` itself, so concurrent
requests don't trigger duplicate network calls.

See also
========

- :doc:`request-lifecycle` — step-by-step request flow with sequence diagrams
- :doc:`bundling` — esbuild configuration and source map handling
- :doc:`live-preview` — live preview architecture for admin forms
- :doc:`/reference/cli` — CLI reference for ``wilco serve`` and ``wilco build``
- :doc:`/specs/http-caching` — HTTP caching specification
