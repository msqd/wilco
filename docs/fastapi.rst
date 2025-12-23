==================
FastAPI Integration
==================

.. contents:: Table of Contents
   :local:
   :depth: 2

Overview
========

The FastAPI bridge provides a simple way to serve wilco components from any
FastAPI application. It exposes API endpoints for listing, fetching, and
getting metadata for components.

Installation
============

Wilco is designed to work with FastAPI out of the box. Ensure you have
both packages installed:

.. code-block:: bash

    pip install wilco fastapi uvicorn

Quick Start
===========

Here's a minimal example that serves components from a directory:

.. code-block:: python

    from pathlib import Path
    from fastapi import FastAPI
    from wilco import ComponentRegistry
    from wilco.bridges.fastapi import create_router

    app = FastAPI()

    # Create a registry pointing to your components
    registry = ComponentRegistry(Path("./components"))

    # Mount the wilco router
    app.include_router(create_router(registry), prefix="/api")

    if __name__ == "__main__":
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)

This creates three endpoints:

- ``GET /api/bundles`` - List available components
- ``GET /api/bundles/{name}.js`` - Get bundled JavaScript
- ``GET /api/bundles/{name}/metadata`` - Get component metadata

API Reference
=============

create_router
-------------

.. code-block:: python

    from wilco.bridges.fastapi import create_router

    def create_router(registry: ComponentRegistry) -> APIRouter:
        """Create an APIRouter with component serving endpoints.

        Args:
            registry: The component registry to serve components from.

        Returns:
            A FastAPI APIRouter that can be mounted on any app.
        """

The returned router provides the following endpoints:

GET /bundles
^^^^^^^^^^^^

List all available component bundles.

**Response:**

.. code-block:: json

    [
        {"name": "counter"},
        {"name": "product_card"},
        {"name": "ui.button"}
    ]

GET /bundles/{name}.js
^^^^^^^^^^^^^^^^^^^^^^

Get the bundled JavaScript for a component.

**Parameters:**

- ``name``: Component name (e.g., ``counter``, ``ui.button``)

**Response:**

- Content-Type: ``application/javascript``
- Cache-Control: ``public, max-age=31536000, immutable``

The response contains the bundled ESM JavaScript with inline source maps.

**Errors:**

- ``404``: Component not found
- ``500``: Bundle generation failed

GET /bundles/{name}/metadata
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Get metadata for a component, including its JSON schema and content hash.

**Parameters:**

- ``name``: Component name

**Response:**

.. code-block:: json

    {
        "title": "Counter",
        "description": "A simple counter component",
        "version": "1.0.0",
        "properties": {
            "initialValue": {"type": "number", "default": 0},
            "step": {"type": "number", "default": 1}
        },
        "hash": "abc123def456"
    }

The ``hash`` field can be used for cache busting on the frontend.

**Errors:**

- ``404``: Component not found

Component Registry
==================

Multiple Sources
----------------

You can register components from multiple directories:

.. code-block:: python

    registry = ComponentRegistry()

    # Add components from multiple sources
    registry.add_source(Path("./shared_components"))
    registry.add_source(Path("./app_components"), prefix="app")

    app.include_router(create_router(registry), prefix="/api")

With a prefix, components are namespaced:

- ``./shared_components/button/`` becomes ``button``
- ``./app_components/header/`` becomes ``app:header``

Caching
=======

The FastAPI bridge returns long-lived cache headers for component bundles:

.. code-block:: http

    Cache-Control: public, max-age=31536000, immutable

To enable cache busting:

1. Fetch the metadata endpoint to get the ``hash``
2. Append the hash as a query parameter: ``/api/bundles/counter.js?abc123``

The hash changes whenever the component source changes.

Full Example
============

Here's a complete example with CORS and development server:

.. code-block:: python

    from pathlib import Path
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from wilco import ComponentRegistry
    from wilco.bridges.fastapi import create_router

    app = FastAPI(title="My Component Server")

    # Enable CORS for frontend development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite dev server
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    # Set up component registry
    registry = ComponentRegistry()
    registry.add_source(Path("./components"))

    # Mount API routes
    app.include_router(create_router(registry), prefix="/api")

    @app.get("/")
    def root():
        return {"message": "Component server running"}

    if __name__ == "__main__":
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

Frontend Integration
====================

From the frontend, you can load components using the wilco loader:

.. code-block:: typescript

    import { useComponent } from '@wilcojs/react';

    function App() {
        const Counter = useComponent('counter');

        return (
            <Suspense fallback={<div>Loading...</div>}>
                <Counter initialValue={10} step={2} />
            </Suspense>
        );
    }

See the :doc:`components </specs/components>` documentation for more details
on component composition.
