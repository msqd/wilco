=============
CLI Reference
=============

wilco provides a command-line interface for development and production workflows.

.. code-block:: bash

    wilco <command> [options]

If no command is specified, ``serve`` is used by default.

wilco serve
===========

Start a development server with live component bundling.

.. code-block:: bash

    wilco serve [--components-dir DIR]

Options
-------

``--components-dir DIR``
    Path to the components directory. Defaults to ``./components`` if it exists,
    otherwise falls back to the built-in example components.

The server starts on ``http://0.0.0.0:8000`` with auto-reload enabled. It uses
FastAPI with uvicorn and exposes the standard API endpoints:

- ``GET /api/bundles`` — list available components
- ``GET /api/bundles/{name}.js`` — get bundled JavaScript
- ``GET /api/bundles/{name}/metadata`` — get component metadata

CORS is configured to allow requests from ``http://localhost:5173`` (Vite dev
server) by default.

wilco build
===========

Pre-compile component bundles for production deployment.

.. code-block:: bash

    wilco build --output DIR [options]

Options
-------

``--output DIR`` (required)
    Output directory for pre-built bundles and manifest.

``--components-dir DIR``
    Path to the components directory. Defaults to ``./components`` if it exists,
    otherwise falls back to the built-in example components.

``--prefix PREFIX``
    Prefix for component names (e.g., ``store``). Components will be registered
    as ``store:component_name`` instead of ``component_name``.

``--no-minify``
    Disable JavaScript minification. Useful for debugging production bundles.

``--sourcemap``
    Include source maps in the output. Disabled by default.

Output structure
----------------

.. code-block:: text

    dist/wilco/
    ├── manifest.json
    └── bundles/
        ├── component_name.a1b2c3d4.js
        ├── store--product.e5f6g7h8.js
        └── ...

The ``manifest.json`` maps component names to their hashed bundle files:

.. code-block:: json

    {
      "component_name": {
        "file": "bundles/component_name.a1b2c3d4.js",
        "hash": "a1b2c3d4"
      },
      "store:product": {
        "file": "bundles/store--product.e5f6g7h8.js",
        "hash": "e5f6g7h8"
      }
    }

Component names containing colons are sanitized for filenames: ``:`` becomes
``--`` (e.g., ``store:product`` → ``store--product.{hash}.js``).

Examples
--------

.. code-block:: bash

    # Basic build
    wilco build --output dist/wilco/

    # Build with prefix and source maps
    wilco build --output dist/wilco/ --prefix store --sourcemap

    # Build from a specific directory without minification
    wilco build --output dist/wilco/ --components-dir ./my_components --no-minify

Environment variables
=====================

``WILCO_BUILD_DIR``
    Path to the pre-built bundles directory. Used by bridges and the Django
    integration to locate the manifest. When set to an empty string, pre-built
    bundles are explicitly disabled.

    .. code-block:: bash

        export WILCO_BUILD_DIR=dist/wilco

    This can also be resolved programmatically:

    .. code-block:: python

        from pathlib import Path
        from wilco.manifest import resolve_build_dir

        # Checks WILCO_BUILD_DIR env var first, then falls back to default path
        build_dir = resolve_build_dir(Path("./dist/wilco"))

Django management command
=========================

The Django bridge provides an equivalent management command:

.. code-block:: bash

    python manage.py wilco_build [--output DIR]

When ``--output`` is not specified, it uses the ``WILCO_BUILD_DIR`` setting.
See :doc:`/how-to/django` for details.
