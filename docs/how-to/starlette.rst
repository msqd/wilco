=====================
Starlette Integration
=====================

Overview
========

The Starlette bridge provides a lightweight way to serve wilco components from
pure Starlette applications. It returns a list of Route objects that can be
mounted on any Starlette application.

Installation
============

Install wilco with Starlette support using the optional extra:

.. code-block:: bash

    pip install wilco[starlette]

This installs wilco with Starlette (>= 0.40.0). For development, you'll also
want uvicorn:

.. code-block:: bash

    pip install wilco[starlette] uvicorn

Quick start
===========

Here's a minimal example that serves components from a directory:

.. code-block:: python

    from pathlib import Path
    from starlette.applications import Starlette
    from starlette.routing import Mount
    from wilco import ComponentRegistry
    from wilco.bridges.starlette import create_routes

    # Create a registry pointing to your components
    registry = ComponentRegistry(Path("./components"))

    # Create wilco routes
    routes = create_routes(registry)

    # Mount on your Starlette app
    app = Starlette(routes=[
        Mount("/api", routes=routes),
    ])

    if __name__ == "__main__":
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)

This creates three endpoints:

- ``GET /api/bundles`` - List available components
- ``GET /api/bundles/{name}.js`` - Get bundled JavaScript
- ``GET /api/bundles/{name}/metadata`` - Get component metadata

API reference
=============

create_routes
-------------

.. code-block:: python

    from wilco.bridges.starlette import create_routes

    def create_routes(registry: ComponentRegistry) -> list[Route]:
        """Create Starlette routes for component serving.

        Args:
            registry: The component registry to serve components from.

        Returns:
            A list of Starlette Route objects that can be mounted on any app.
        """

The returned routes provide the following endpoints:

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

    routes = create_routes(registry)

    app = Starlette(routes=[
        Mount("/api", routes=routes),
    ])

With a prefix, components are namespaced:

- ``./shared_components/button/`` becomes ``button``
- ``./app_components/header/`` becomes ``app:header``

Caching
=======

The Starlette bridge returns long-lived cache headers for component bundles:

.. code-block:: text

    Cache-Control: public, max-age=31536000, immutable

To enable cache busting:

1. Fetch the metadata endpoint to get the ``hash``
2. Append the hash as a query parameter: ``/api/bundles/counter.js?abc123``

The hash changes whenever the component source changes.

Full example
============

Here's a complete example with CORS middleware:

.. code-block:: python

    from pathlib import Path
    from starlette.applications import Starlette
    from starlette.middleware import Middleware
    from starlette.middleware.cors import CORSMiddleware
    from starlette.routing import Mount, Route
    from starlette.responses import JSONResponse
    from wilco import ComponentRegistry
    from wilco.bridges.starlette import create_routes

    # Set up component registry
    registry = ComponentRegistry()
    registry.add_source(Path("./components"))

    # Create wilco routes
    wilco_routes = create_routes(registry)

    def homepage(request):
        return JSONResponse({"message": "Component server running"})

    # Configure CORS for frontend development
    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173"],  # Vite dev server
            allow_methods=["GET"],
            allow_headers=["*"],
        )
    ]

    app = Starlette(
        routes=[
            Route("/", homepage),
            Mount("/api", routes=wilco_routes),
        ],
        middleware=middleware,
    )

    if __name__ == "__main__":
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

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

Template-based rendering
========================

For server-rendered applications using Jinja2 templates, you can embed wilco
components directly in your HTML templates using a widget helper:

.. code-block:: python

    from pathlib import Path
    from starlette.applications import Starlette
    from starlette.routing import Mount, Route
    from starlette.templating import Jinja2Templates
    from wilco import ComponentRegistry
    from wilco.bridges.starlette import create_routes

    # Widget helper for templates
    class WilcoComponentWidget:
        def __init__(self, component_name: str, props: dict = None, api_base: str = "/api"):
            self.component_name = component_name
            self.props = props or {}
            self.api_base = api_base

        def __html__(self):
            import html, json, uuid
            props_json = html.escape(json.dumps(self.props), quote=True)
            container_id = f"wilco-{uuid.uuid4().hex[:8]}"
            return f'''<div id="{container_id}"
                 data-wilco-component="{self.component_name}"
                 data-wilco-props="{props_json}"
                 data-wilco-api="{self.api_base}">
                Loading...
            </div>'''

    templates = Jinja2Templates(directory="templates")
    registry = ComponentRegistry(Path("./components"))

    async def product_list(request):
        widget = WilcoComponentWidget("store:product_list", props={
            "products": [{"name": "Widget", "price": 9.99}]
        })
        return templates.TemplateResponse(request, "products.html", {"widget": widget})

    app = Starlette(routes=[
        Route("/", product_list),
        Mount("/api", routes=create_routes(registry)),
    ])

In your template:

.. code-block:: html

    <!DOCTYPE html>
    <html>
    <body>
        {{ widget }}
        <script src="/static/wilco/loader.js" defer></script>
    </body>
    </html>

Example application
===================

A complete example application is available in the `examples/starlette/
<https://github.com/msqd/wilco/tree/main/examples/starlette>`_ directory.
It demonstrates:

- Jinja2 template-based rendering with wilco components
- Starlette-Admin for product management
- SQLAlchemy database models
- Shared components from ``examples/common/components/``

To run the example:

.. code-block:: bash

    cd examples/starlette
    make setup   # Install deps, create database, load fixtures
    make start   # Run development server

Visit http://localhost:8000 for the store, http://localhost:8000/admin for the admin.

Live preview in Starlette-Admin
===============================

The Starlette example includes live preview functionality that shows real-time
component updates as admin users edit forms. This enables WYSIWYG editing of
content that uses wilco components.

Architecture
------------

The live preview system consists of four parts:

1. **AdminPreviewMiddleware** - Injects preview scripts into admin pages
2. **admin-preview-inject.js** - Creates the two-column layout UI
3. **live-loader-starlette.js** - Handles form validation and preview updates
4. **Validation endpoints** - Server-side form validation returning component props

AdminPreviewMiddleware
----------------------

This ASGI middleware intercepts HTML responses for ``/admin`` routes and injects
the necessary scripts before ``</body>``:

.. code-block:: python

    from starlette.types import ASGIApp, Message, Receive, Scope, Send

    class AdminPreviewMiddleware:
        """Middleware to inject live preview scripts into Starlette-Admin pages."""

        INJECT_SCRIPTS = """
        <script src="/wilco-static/wilco/loader.js" defer></script>
        <script src="/static/wilco/admin-preview-inject.js" defer></script>
        <script src="/static/wilco/live-loader-starlette.js" defer></script>
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
            # ... (full implementation in examples/starlette/app/main.py)

Wrap your application after mounting admin:

.. code-block:: python

    app = Starlette(routes=routes, middleware=middleware)
    admin = create_admin()
    admin.mount_to(app)

    # Wrap with preview middleware
    app = AdminPreviewMiddleware(app)

Validation endpoint
-------------------

Create a validation endpoint that receives form data and returns component props:

.. code-block:: python

    from starlette.requests import Request
    from starlette.responses import JSONResponse
    from starlette.routing import Route

    async def validate_preview(request: Request) -> JSONResponse:
        """Validate form data and return props for live preview."""
        if request.method != "POST":
            return JSONResponse({"error": "Method not allowed"}, status_code=405)

        # Get product ID from path if editing existing item
        product_id = request.path_params.get("id")
        product = None
        if product_id:
            product = get_product_by_id(product_id)  # Your DB lookup

        # Parse form data
        form_data = await request.form()
        data = {key: value for key, value in form_data.items()}

        # Validate
        errors = {}
        if not data.get("name"):
            errors["name"] = ["Name is required"]
        if not data.get("price"):
            errors["price"] = ["Price is required"]

        if errors:
            return JSONResponse({"success": False, "errors": errors})

        # Convert to component props
        props = {
            "name": data.get("name", ""),
            "price": float(data.get("price", 0)),
            "description": data.get("description", ""),
            "imageUrl": f"/media/{data.get('image')}" if data.get("image") else "/placeholder.jpg",
        }

        return JSONResponse({"success": True, "props": props})

    def get_preview_routes() -> list[Route]:
        """Get routes for preview validation endpoints."""
        return [
            Route("/admin/product/preview", validate_preview, methods=["POST"]),
            Route("/admin/product/{id:int}/preview", validate_preview, methods=["POST"]),
        ]

Preview UI injection
--------------------

The ``admin-preview-inject.js`` script automatically detects product edit pages
and creates a two-column layout with the form on the left and preview on the right.

Key features:

- **Resizable sidebar**: Drag the handle to resize the preview panel
- **Width persistence**: Remembers width per admin type (product, category, etc.)
- **Responsive layout**: Stacks vertically on small screens or when preview exceeds 50% width
- **Toggle button**: Switch between sidebar and full-width stacked modes

The preview container uses data attributes to configure the component:

.. code-block:: html

    <div id="wilco-preview-container"
         data-wilco-component="store:product_preview"
         data-wilco-props="{}"
         data-wilco-api="/api"
         data-wilco-live="true"
         data-wilco-validate-url="/admin/product/123/preview">
    </div>

Live form validation
--------------------

The ``live-loader-starlette.js`` script monitors form inputs and triggers
debounced validation requests (300ms delay). When the server returns new props,
the preview component updates automatically.

The script:

1. Listens for ``input`` and ``change`` events on form fields
2. Collects form data and POSTs to the validation URL
3. On success, updates component props via ``window.wilco.updateComponentProps``
4. On validation errors, displays them above the preview

Customizing for other models
----------------------------

To add live preview to other admin models:

1. Create a preview component (e.g., ``store:category_preview``)
2. Add validation routes for the model
3. The ``admin-preview-inject.js`` can be modified to detect other edit pages
4. Add preview width storage keys as needed (stored as ``wilco-preview-width-{type}``)

Static files setup
------------------

Ensure your static file mounts serve both the wilco loader and your preview scripts:

.. code-block:: python

    from starlette.staticfiles import StaticFiles

    # Wilco static files from the package
    WILCO_STATIC_DIR = Path("path/to/wilco/bridges/django/static")

    routes = [
        # Your routes...
        Mount("/static", StaticFiles(directory="resources/static"), name="static"),
        Mount("/wilco-static", StaticFiles(directory=WILCO_STATIC_DIR), name="wilco_static"),
    ]

Comparison with FastAPI
=======================

The Starlette bridge is a lighter alternative to the FastAPI bridge:

- **Use Starlette bridge** when you want minimal dependencies and don't need
  FastAPI features like automatic OpenAPI docs or Pydantic validation.

- **Use FastAPI bridge** when you're already using FastAPI and want seamless
  integration with its dependency injection and automatic documentation.

Both bridges expose the same endpoints and behavior.
