=================
Flask Integration
=================

Overview
========

The Flask bridge provides a simple way to serve wilco components from any
Flask application. It exposes API endpoints via a Flask Blueprint for listing,
fetching, and getting metadata for components.

Installation
============

Install wilco with Flask support using the optional extra:

.. code-block:: bash

    pip install wilco[flask]

This installs wilco with Flask (>= 3.0.0). For development, you'll also
want a WSGI server like gunicorn or werkzeug's built-in server.

Quick start
===========

Here's a minimal example that serves components from a directory:

.. code-block:: python

    from pathlib import Path
    from flask import Flask
    from wilco import ComponentRegistry
    from wilco.bridges.flask import create_blueprint

    app = Flask(__name__)

    # Create a registry pointing to your components
    registry = ComponentRegistry(Path("./components"))

    # Register the wilco blueprint
    app.register_blueprint(create_blueprint(registry), url_prefix="/api")

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=8200)

This creates three endpoints:

- ``GET /api/bundles`` - List available components
- ``GET /api/bundles/{name}.js`` - Get bundled JavaScript
- ``GET /api/bundles/{name}/metadata`` - Get component metadata

API reference
=============

create_blueprint
----------------

.. code-block:: python

    from wilco.bridges.flask import create_blueprint

    def create_blueprint(registry: ComponentRegistry) -> Blueprint:
        """Create a Flask Blueprint with component serving endpoints.

        Args:
            registry: The component registry to serve components from.

        Returns:
            A Flask Blueprint that can be registered on any app.
        """

The returned blueprint provides the following endpoints:

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

    app.register_blueprint(create_blueprint(registry), url_prefix="/api")

With a prefix, components are namespaced:

- ``./shared_components/button/`` becomes ``button``
- ``./app_components/header/`` becomes ``app:header``

Caching
=======

The Flask bridge returns long-lived cache headers for component bundles:

.. code-block:: text

    Cache-Control: public, max-age=31536000, immutable

To enable cache busting:

1. Fetch the metadata endpoint to get the ``hash``
2. Append the hash as a query parameter: ``/api/bundles/counter.js?abc123``

The hash changes whenever the component source changes.

Template-based rendering
========================

For server-rendered applications using Jinja2 templates, you can embed wilco
components directly in your HTML templates using a widget helper:

.. code-block:: python

    import html
    import json
    import uuid
    from markupsafe import Markup

    class WilcoComponentWidget:
        def __init__(self, component_name: str, props: dict = None, api_base: str = "/api"):
            self.component_name = component_name
            self.props = props or {}
            self.api_base = api_base

        def render(self) -> str:
            props_json = html.escape(json.dumps(self.props), quote=True)
            container_id = f"wilco-{uuid.uuid4().hex[:8]}"
            return f'''<div id="{container_id}"
                 data-wilco-component="{self.component_name}"
                 data-wilco-props="{props_json}"
                 data-wilco-api="{self.api_base}">
                Loading...
            </div>'''

        def __html__(self):
            return self.render()

Use in a view:

.. code-block:: python

    @app.route("/")
    def product_list():
        products = Product.query.all()
        widget = WilcoComponentWidget("store:product_list", props={
            "products": [{"name": p.name, "price": float(p.price)} for p in products]
        })
        return render_template("products.html", widget=widget)

In your template:

.. code-block:: html

    <!DOCTYPE html>
    <html>
    <body>
        {{ widget }}
        <script src="/wilco-static/wilco/loader.js" defer></script>
    </body>
    </html>

Static files setup
------------------

Serve the wilco loader script alongside your application's static files:

.. code-block:: python

    from wilco.bridges.base import STATIC_DIR as WILCO_STATIC_DIR

    @app.route("/wilco-static/<path:filename>")
    def wilco_static(filename):
        return send_from_directory(str(WILCO_STATIC_DIR), filename)

Live preview in Flask-Admin
===========================

The Flask example includes live preview functionality that shows real-time
component updates as admin users edit forms.

Architecture
------------

The live preview system consists of four parts:

1. **Script injection** - An ``after_request`` hook injects preview scripts into admin pages
2. **admin-preview-inject.js** - Creates the two-column layout UI
3. **live-loader-flask.js** - Handles form validation and preview updates
4. **Validation endpoints** - Server-side form validation returning component props

Script injection
----------------

Use Flask's ``after_request`` hook to inject scripts into admin HTML pages:

.. code-block:: python

    INJECT_SCRIPTS = """
        <script src="/wilco-static/wilco/loader.js" defer></script>
        <script src="/static/wilco/admin-preview-inject.js" defer></script>
        <script src="/static/wilco/live-loader-flask.js" defer></script>
        </body>"""

    @app.after_request
    def inject_preview_scripts(response):
        if (
            request.path.startswith("/admin")
            and response.content_type
            and "text/html" in response.content_type
        ):
            html = response.get_data(as_text=True)
            if "</body>" in html:
                html = html.replace("</body>", INJECT_SCRIPTS)
                response.set_data(html)
        return response

Validation endpoint
-------------------

Create a validation endpoint that receives form data and returns component props:

.. code-block:: python

    from flask import jsonify, request
    from .models import Product

    def get_preview_props(form_data, product=None):
        """Convert form data to component props."""
        price = form_data.get("price", 0)
        if isinstance(price, str):
            try:
                price = float(price.replace(",", ".")) if price else 0
            except ValueError:
                price = 0

        image = form_data.get("image", "")
        if image:
            image_url = f"/media/{image}"
        elif product and product.image:
            image_url = f"/media/{product.image}"
        else:
            image_url = "https://picsum.photos/seed/placeholder/600/400"

        return {
            "name": form_data.get("name", ""),
            "price": float(price),
            "description": form_data.get("description", "") or "",
            "imageUrl": image_url,
        }

    def validate_preview(product_id=None):
        """Validate form data and return props for live preview."""
        product = None
        if product_id:
            product = Product.query.get(product_id)

        data = dict(request.form)
        errors = {}

        if not data.get("name"):
            errors["name"] = ["Name is required"]
        if not data.get("price"):
            errors["price"] = ["Price is required"]

        if errors:
            return jsonify({"success": False, "errors": errors})

        props = get_preview_props(data, product)
        return jsonify({"success": True, "props": props})

    # Register routes
    app.add_url_rule("/admin/product/preview", "product_preview",
                     validate_preview, methods=["POST"])
    app.add_url_rule("/admin/product/<int:product_id>/preview", "product_preview_edit",
                     validate_preview, methods=["POST"])

Example application
===================

A complete example application is available in the `examples/flask/
<https://github.com/msqd/wilco/tree/main/examples/flask>`_ directory.
It demonstrates:

- Jinja2 template-based rendering with wilco components
- Flask-Admin for product management with live preview
- SQLAlchemy database models
- Shared components from ``examples/common/components/``

To run the example:

.. code-block:: bash

    cd examples/flask
    make setup   # Install deps, create database, load fixtures
    make start   # Run development server

Visit http://localhost:8200 for the store, http://localhost:8200/admin for the admin.
