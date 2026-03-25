=====================
Bundling and esbuild
=====================

This document explains how wilco bundles TypeScript components into JavaScript
that can run in the browser. It covers esbuild configuration, the external
dependency model, source map handling, and the pre-compilation pipeline.

How bundling works
==================

When a component is requested, wilco's Python bundler runs esbuild to transform
the TypeScript source into a single JavaScript file:

.. mermaid::

   graph LR
       A["index.tsx"] --> B[esbuild]
       C["Button.tsx"] --> B
       D["styles.ts"] --> B

       B --> E["ESM bundle"]
       E --> F["Source map rewrite"]
       F --> G["SHA-256 hash"]
       G --> H["BundleResult<br/>(code + hash)"]

       style B fill:#fef3c7,stroke:#d97706
       style H fill:#d1fae5,stroke:#059669

esbuild configuration
=====================

The bundler invokes esbuild with these flags:

.. list-table::
   :widths: 30 70
   :header-rows: 1

   * - Flag
     - Purpose
   * - ``--bundle``
     - Inline all local imports (files within the component directory)
   * - ``--format=esm``
     - Output ES modules (transformed to runtime registry by loader.js)
   * - ``--target=es2020``
     - Browser compatibility target
   * - ``--jsx=automatic``
     - React 17+ JSX transform (no manual ``import React`` needed)
   * - ``--external:react``
     - Don't bundle React (provided by loader.js at runtime)
   * - ``--external:react-dom``
     - Don't bundle ReactDOM
   * - ``--external:react/jsx-runtime``
     - Don't bundle JSX runtime
   * - ``--external:@wilcojs/react``
     - Don't bundle wilco's React hooks
   * - ``--external:goober``
     - Don't bundle CSS-in-JS library
   * - ``--sourcemap=inline``
     - Include source maps in the bundle (development)
   * - ``--sources-content=true``
     - Embed original source in source maps

For production builds (``wilco build``), additional flags:

- ``--minify`` — reduce bundle size (can be disabled with ``--no-minify``)
- ``--sourcemap`` is off by default (enable with ``--sourcemap`` flag)

External dependencies
=====================

External dependencies are not bundled with the component. Instead, they're
provided at runtime via the module registry (``window.__MODULES__``):

.. mermaid::

   graph TD
       subgraph "Bundled by esbuild"
           A[index.tsx]
           B[Button.tsx]
           C[styles.ts]
       end

       subgraph "Provided at runtime"
           D[react]
           E[react-dom]
           F["@wilcojs/react"]
           G[goober]
       end

       A --> B
       A --> C
       A -.->|"import"| D
       A -.->|"import"| F

       style D fill:#e0e7ff,stroke:#4f46e5
       style E fill:#e0e7ff,stroke:#4f46e5
       style F fill:#e0e7ff,stroke:#4f46e5
       style G fill:#e0e7ff,stroke:#4f46e5

**Why externals?**

- **Single React instance** — all components share one React, avoiding hooks
  and context issues that arise from multiple React copies
- **Smaller bundles** — React alone is ~130KB minified. Without externals, every
  component would include its own copy
- **Consistent versions** — the loader controls which React version all components use

**Limitation**: components can only import modules registered in
``window.__MODULES__``. Arbitrary npm packages cannot be used unless they are
local files bundled with the component.

To use a third-party library in a component, install it locally and import it
from a relative path (esbuild will bundle it):

.. code-block:: tsx

    // This works: local file, bundled by esbuild
    import { formatDate } from "./utils";

    // This works: registered external
    import { useState } from "react";

    // This does NOT work: not in module registry
    import dayjs from "dayjs";

esbuild resolution order
========================

The bundler searches for esbuild in this order:

1. **Frontend node_modules** — ``src/wilcojs/react/node_modules/.bin/esbuild``
   (development, when the monorepo is available)
2. **Global PATH** — ``esbuild`` on the system PATH
3. **Common npm paths** — ``/opt/homebrew/bin/esbuild``,
   ``/usr/local/bin/esbuild``, etc.
4. **npx fallback** — ``npx --yes esbuild`` (downloads esbuild on demand)

If none are found, a ``BundlerNotFoundError`` is raised with installation
instructions.

Source map handling
===================

Source maps enable debugging original TypeScript in browser DevTools.

Rewriting source URLs
---------------------

esbuild generates source maps with filesystem paths as sources. The bundler
rewrites these to a custom URL scheme:

.. code-block:: text

    Before: "../components/store/product/Button.tsx"
    After:  "component://store:product/Button.tsx"

This provides:

- **Clean source names** in DevTools (no filesystem paths leaked)
- **Component identification** in stack traces
- **Consistent naming** regardless of the server's file layout

The transformation:

1. Extract the inline source map (base64-encoded JSON after ``//# sourceMappingURL=``)
2. Decode and parse the JSON
3. Rewrite each ``sources`` entry using the component name
4. Re-encode and replace the original source map comment

A ``//# sourceURL`` comment is also added for DevTools identification:

.. code-block:: javascript

    //# sourceURL=components://bundles/store:product.js

Content hashing
---------------

After bundling and source map rewriting, the bundler computes a SHA-256 hash
of the final JavaScript code (first 12 hex characters). This hash is used for:

- **Cache busting** — appended as a query parameter in API mode
- **Immutable filenames** — part of the filename in static mode
  (e.g., ``counter.a1b2c3d4e5f6.js``)

Pre-compilation pipeline
========================

The ``wilco build`` command pre-compiles all components for production:

.. mermaid::

   graph TD
       A[ComponentRegistry] -->|"discover all"| B[Component list]
       B --> C{For each component}
       C --> D[bundle_component]
       D --> E["sanitize name<br/>(: → --)"]
       E --> F["Write bundles/{name}.{hash}.js"]
       C --> G[manifest.json]

       style A fill:#e0e7ff,stroke:#4f46e5
       style G fill:#d1fae5,stroke:#059669

Filename sanitization
---------------------

Component names can contain colons (e.g., ``store:product``), which are not
valid in filenames on all platforms. The build process replaces colons with
double dashes:

.. code-block:: text

    store:product  →  store--product.a1b2c3d4.js
    ui.button      →  ui.button.e5f6g7h8.js

Manifest format
---------------

The ``manifest.json`` file maps component names to their output files:

.. code-block:: json

    {
      "store:product": {
        "file": "bundles/store--product.a1b2c3d4.js",
        "hash": "a1b2c3d4"
      },
      "counter": {
        "file": "bundles/counter.e5f6g7h8.js",
        "hash": "e5f6g7h8"
      }
    }

The ``file`` path is relative to the manifest's directory. The ``hash`` is the
same SHA-256 prefix used for cache busting.

Build output structure
----------------------

.. code-block:: text

    dist/wilco/
    ├── manifest.json
    └── bundles/
        ├── counter.a1b2c3d4.js
        ├── store--product.e5f6g7h8.js
        └── ui.button.i9j0k1l2.js

Django integration
------------------

For Django, the ``WilcoBundleFinder`` integrates with ``collectstatic``:

.. mermaid::

   graph LR
       A["wilco_build"] -->|"generates"| B["dist/wilco/"]
       B -->|"WilcoBundleFinder"| C["collectstatic"]
       C -->|"copies to"| D["STATIC_ROOT/wilco/"]
       D -->|"served by"| E["WhiteNoise / nginx"]

       style A fill:#e0e7ff,stroke:#4f46e5
       style E fill:#d1fae5,stroke:#059669

See also
========

- :doc:`architecture` — high-level system overview
- :doc:`request-lifecycle` — how bundles are loaded and transformed at runtime
- :doc:`/reference/cli` — ``wilco build`` command reference
- :doc:`/reference/components` — component structure and naming
