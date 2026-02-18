===================
FastAPI Integration
===================

Overview
========

The FastAPI bridge provides a simple way to serve wilco components from any
FastAPI application. It exposes API endpoints for listing, fetching, and
getting metadata for components.

Installation
============

Install wilco with FastAPI support using the optional extra:

.. code-block:: bash

    pip install wilco[fastapi]

This installs wilco with FastAPI (>= 0.115.0). For development, you'll also
want uvicorn:

.. code-block:: bash

    pip install wilco[fastapi] uvicorn

Quick start
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
        uvicorn.run(app, host="0.0.0.0", port=8301)

This creates three endpoints:

- ``GET /api/bundles`` - List available components
- ``GET /api/bundles/{name}.js`` - Get bundled JavaScript
- ``GET /api/bundles/{name}/metadata`` - Get component metadata

API reference
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
- ``422``: Invalid component name
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
- ``422``: Invalid component name

Component registry
==================

Multiple sources
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

.. code-block:: text

    Cache-Control: public, max-age=31536000, immutable

To enable cache busting:

1. Fetch the metadata endpoint to get the ``hash``
2. Append the hash as a query parameter: ``/api/bundles/counter.js?abc123``

The hash changes whenever the component source changes.

Full example
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
        uvicorn.run(app, host="0.0.0.0", port=8301, reload=True)

Frontend integration
====================

From the frontend, you can load components using the wilco loader:

.. code-block:: tsx

    import { useComponent } from '@wilcojs/react';

    function App() {
        const Counter = useComponent('counter');

        return (
            <Suspense fallback={<div>Loading...</div>}>
                <Counter initialValue={10} step={2} />
            </Suspense>
        );
    }

See the :doc:`/reference/components` documentation for more details
on component composition.

Example application
===================

A complete example application is available in the `examples/fastapi/
<https://github.com/msqd/wilco/tree/main/examples/fastapi>`_ directory.
It demonstrates:

- A React SPA frontend (Vite + React 19)
- SQLAdmin for product management with live preview
- REST API endpoints for products
- Component bundles served via the FastAPI bridge
- ASGI middleware for injecting preview scripts

To run the example:

.. code-block:: bash

    cd examples/fastapi
    make setup   # Install deps, create database, load fixtures
    make start   # Run backend + frontend (requires overmind)

Visit http://localhost:8300 for the store, http://localhost:8301/admin for the admin.

Live preview in SQLAdmin
========================

The FastAPI example includes live preview functionality that shows real-time
component updates as admin users edit forms.

Architecture
------------

The live preview system consists of four parts:

1. **AdminPreviewMiddleware** - ASGI middleware that injects preview scripts into admin pages
2. **admin-preview-inject.js** - Creates the two-column layout UI
3. **live-loader-fastapi.js** - Handles form validation and preview updates
4. **Validation endpoints** - FastAPI routes for form validation returning component props

AdminPreviewMiddleware
----------------------

This ASGI middleware intercepts HTML responses for ``/admin`` routes and injects
the necessary scripts before ``</body>``:

.. code-block:: python

    from starlette.types import ASGIApp, Message, Receive, Scope, Send

    class AdminPreviewMiddleware:
        """Middleware to inject live preview scripts into SQLAdmin pages."""

        INJECT_SCRIPTS = """
        <script src="/wilco-static/wilco/loader.js" defer></script>
        <script src="/static/wilco/admin-preview-inject.js" defer></script>
        <script src="/static/wilco/live-loader-fastapi.js" defer></script>
        </body>"""

        def __init__(self, app: ASGIApp) -> None:
            self.app = app

        async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
            if scope["type"] != "http":
                await self.app(scope, receive, send)
                return

            path = scope.get("path", "")

            # Only inject into admin pages
            if not path.startswith("/admin"):
                await self.app(scope, receive, send)
                return

            # Buffer response and inject scripts before </body>
            # ... (full implementation in examples/fastapi/app/main.py)

Wrap your application after mounting admin:

.. code-block:: python

    app = FastAPI()
    admin = Admin(app, engine, title="Admin")
    admin.add_view(ProductAdmin)

    # Wrap with preview middleware
    app = AdminPreviewMiddleware(app)

Validation endpoint
-------------------

Create validation endpoints that receive form data and return component props:

.. code-block:: python

    from fastapi import APIRouter, Depends, Request
    from starlette.responses import JSONResponse
    from sqlalchemy.orm import Session

    preview_router = APIRouter()

    @preview_router.post("/admin/product/preview")
    async def validate_preview_create(request: Request, db: Session = Depends(get_db)):
        return await _validate_preview(request, db)

    @preview_router.post("/admin/product/{product_id:int}/preview")
    async def validate_preview_edit(request: Request, product_id: int, db: Session = Depends(get_db)):
        return await _validate_preview(request, db, product_id=product_id)

.. important::

   Preview routes must be registered **before** SQLAdmin's mount to take priority
   over SQLAdmin's ``/admin`` catch-all route.

Static files setup
------------------

Serve the wilco loader script alongside your application's static files:

.. code-block:: python

    from wilco.bridges.base import STATIC_DIR as WILCO_STATIC_DIR

    app.mount("/wilco-static", StaticFiles(directory=str(WILCO_STATIC_DIR)), name="wilco_static")
