==================
Django Integration
==================

Overview
========

The Django bridge provides deep integration with Django, including:

- Automatic component discovery from Django apps
- Template tags for rendering components
- Admin widget for embedding components
- Live preview mixin for admin forms

Installation
============

Install wilco with Django support using the optional extra:

.. code-block:: bash

    pip install wilco[django]

This installs wilco with Django (>= 4.2.0).

Configuration
-------------

Add ``wilco.bridges.django`` to your ``INSTALLED_APPS``:

.. code-block:: python

    INSTALLED_APPS = [
        # ...
        "wilco.bridges.django",
    ]

Include the wilco URLs in your ``urls.py``:

.. code-block:: python

    from django.urls import include, path

    urlpatterns = [
        path("api/", include("wilco.bridges.django.urls")),
        # ...
    ]

Quick start
===========

Components in Django apps
-------------------------

Place components in a ``components/`` directory inside any Django app:

.. code-block:: text

    myapp/
    ├── models.py
    ├── views.py
    └── components/
        └── product/
            ├── __init__.py
            ├── index.tsx
            └── schema.json

Components are automatically discovered and prefixed with the app label.
For example, ``myapp/components/product/`` becomes ``myapp:product``.

Explicit component sources
--------------------------

You can configure explicit component sources with optional prefixes:

.. code-block:: python

    # settings.py
    WILCO_COMPONENT_SOURCES = [
        (BASE_DIR / "shared_components", ""),       # No prefix: button
        (BASE_DIR / "store" / "components", "store"),  # Prefixed: store:product
    ]

Settings
========

``WILCO_COMPONENT_SOURCES``
    List of ``(path, prefix)`` tuples for explicit component sources. Optional.

``WILCO_AUTODISCOVER``
    Whether to auto-discover components from Django apps (default: ``True``).

``WILCO_BUILD_DIR``
    Path to the directory containing pre-built bundles and ``manifest.json``.
    When set, the bridge serves pre-built bundles instead of bundling at
    runtime. Used by ``WilcoBundleFinder`` for ``collectstatic``, the
    ``wilco_build`` management command, and the template tags for static mode
    detection.

    .. code-block:: python

        WILCO_BUILD_DIR = BASE_DIR / "dist" / "wilco"

    Can also be set via the ``WILCO_BUILD_DIR`` environment variable (takes
    precedence over the setting).

Template tags
=============

Wilco provides template tags for rendering components in Django templates.

Loading components
------------------

.. code-block:: html+django

    {% load wilco_tags %}

    <div class="product-grid">
        {% wilco_component "myapp:product" name=product.name price=product.price %}
    </div>

    {% wilco_loader_script %}

``wilco_component``
^^^^^^^^^^^^^^^^^^^

Renders a component placeholder that will be hydrated by JavaScript.

**Arguments:**

- First positional: component name (required)
- ``api_base``: Base URL for the API (default: ``"/api"``)
- ``**props``: Any additional keyword arguments become component props

**Example:**

.. code-block:: html+django

    {% wilco_component "store:product_card"
        name=product.name
        price=product.price|floatformat:2
        imageUrl=product.image.url %}

``wilco_loader_script``
^^^^^^^^^^^^^^^^^^^^^^^

Includes the wilco loader script. Call once at the end of your template.

.. code-block:: html+django

    <body>
        {% wilco_component "header" %}
        <main>{% block content %}{% endblock %}</main>
        {% wilco_component "footer" %}

        {% wilco_loader_script %}
    </body>

Admin widget
============

The ``WilcoComponentWidget`` class renders components in the Django admin.

Basic usage
-----------

.. code-block:: python

    from django.contrib import admin
    from wilco.bridges.django import WilcoComponentWidget
    from .models import Product

    @admin.register(Product)
    class ProductAdmin(admin.ModelAdmin):
        readonly_fields = ["preview"]

        def preview(self, obj):
            if not obj.pk:
                return "Save to see preview"

            return WilcoComponentWidget(
                "store:product",
                props={
                    "name": obj.name,
                    "price": float(obj.price),
                    "imageUrl": obj.image.url if obj.image else None,
                },
            ).render()

Widget options
--------------

.. code-block:: python

    WilcoComponentWidget(
        component_name,     # Component name (e.g., "store:product")
        props=None,         # Dict of props to pass to the component
        api_base="/api",    # Base URL for the wilco API
        live=False,         # Enable live preview mode
        validate_url=None,  # URL for validation endpoint (required if live=True)
    )

Live preview admin mixin
========================

The ``LivePreviewAdminMixin`` adds automatic live preview to admin forms.
When users edit form fields, the preview updates in real-time.

Basic setup
-----------

.. code-block:: python

    from django.contrib import admin
    from wilco.bridges.django import LivePreviewAdminMixin
    from .models import Product

    @admin.register(Product)
    class ProductAdmin(LivePreviewAdminMixin, admin.ModelAdmin):
        preview_component = "store:product"
        readonly_fields = ["preview"]

        fieldsets = (
            ("Details", {"fields": ["name", "price", "description"]}),
            ("Preview", {"fields": ["preview"]}),
        )

        def get_preview_props(self, form_data, instance=None):
            """Convert form data to component props."""
            return {
                "name": form_data.get("name", ""),
                "price": float(form_data.get("price", 0) or 0),
                "description": form_data.get("description", ""),
            }

How it works
------------

1. The mixin adds a ``validate_preview/`` endpoint to the admin URLs
2. When form fields lose focus, JavaScript POSTs the form data
3. The backend validates using Django's form system
4. On success: new props are returned and the component re-renders
5. On failure: validation errors are displayed above the preview

Required implementation
-----------------------

You must implement ``get_preview_props``:

.. code-block:: python

    def get_preview_props(self, form_data: dict, instance=None) -> dict:
        """Convert form data to component props.

        Args:
            form_data: Dictionary of cleaned form field values.
            instance: The existing model instance (when editing).
                      Useful for file fields that aren't in the POST data.

        Returns:
            Dictionary of props for the component.
        """

Handling file fields
--------------------

File fields require special handling since they're not included in POST data
when unchanged:

.. code-block:: python

    def get_preview_props(self, form_data, instance=None):
        # Check form data first, fall back to instance
        image_url = None

        image = form_data.get("image")
        if image and hasattr(image, "url"):
            image_url = image.url
        elif instance and instance.image:
            image_url = instance.image.url

        return {
            "name": form_data.get("name", ""),
            "imageUrl": image_url,
        }

Customizing preview display
---------------------------

Override ``get_preview_props_from_obj`` for different logic when displaying
an existing object vs. processing form data:

.. code-block:: python

    def get_preview_props_from_obj(self, obj):
        """Get props from saved instance (initial display)."""
        return {
            "name": obj.name,
            "price": float(obj.price),
            # Include computed fields
            "discountedPrice": float(obj.discounted_price),
        }

    def get_preview_props(self, form_data, instance=None):
        """Get props from form data (live updates)."""
        price = float(form_data.get("price", 0) or 0)
        return {
            "name": form_data.get("name", ""),
            "price": price,
            # Compute discount manually
            "discountedPrice": price * 0.9,
        }

API endpoints
=============

The Django bridge provides these endpoints:

``GET /api/bundles``
    List all available component bundles.

``GET /api/bundles/{name}.js``
    Get bundled JavaScript for a component.

``GET /api/bundles/{name}/metadata``
    Get component metadata including hash.

Bundle caching
--------------

Bundles are cached in memory with file modification time (mtime) invalidation.
When a source file changes, the cache is automatically invalidated.

Complete example
================

Here's a full example integrating wilco with Django Unfold admin:

.. code-block:: python

    # models.py
    from django.db import models

    class Product(models.Model):
        name = models.CharField(max_length=200)
        description = models.TextField(blank=True)
        price = models.DecimalField(max_digits=10, decimal_places=2)
        image = models.ImageField(upload_to="products/", blank=True)

    # admin.py
    from django.contrib import admin
    from unfold.admin import ModelAdmin
    from wilco.bridges.django import LivePreviewAdminMixin
    from .models import Product

    @admin.register(Product)
    class ProductAdmin(LivePreviewAdminMixin, ModelAdmin):
        preview_component = "store:product_preview"
        list_display = ["name", "price"]
        readonly_fields = ["preview"]

        fieldsets = (
            ("Details", {
                "classes": ["tab"],
                "fields": ["name", "price", "description", "image"],
            }),
            ("Preview", {
                "classes": ["tab"],
                "fields": ["preview"],
            }),
        )

        def get_preview_props(self, form_data, instance=None):
            price = form_data.get("price", 0)
            if isinstance(price, str):
                price = float(price) if price else 0

            image_url = "https://via.placeholder.com/400"
            image = form_data.get("image")
            if image and hasattr(image, "url"):
                image_url = image.url
            elif instance and instance.image:
                image_url = instance.image.url

            return {
                "name": form_data.get("name", ""),
                "price": float(price),
                "description": form_data.get("description", "") or "",
                "imageUrl": image_url,
            }

Component with both list and detail views:

.. code-block:: tsx

    // components/product_preview/index.tsx
    import React from "react";
    import Product from "../product";

    interface Props {
        name: string;
        price: number;
        description?: string;
        imageUrl?: string;
    }

    export default function ProductPreview(props: Props) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                    <h3>List View</h3>
                    <Product {...props} mode="list" />
                </div>
                <div>
                    <h3>Detail View</h3>
                    <Product {...props} mode="detail" />
                </div>
            </div>
        );
    }


Production deployment
=====================

The Django examples include a production-like setup that mirrors how you would
deploy a real application. This is useful for testing wilco with pre-built
bundles, gunicorn, and ``DEBUG=False``.

Configuration overview
----------------------

The examples use environment variables to toggle between dev and prod modes:

.. code-block:: python

    # config/settings.py
    import os

    DEBUG = os.environ.get("DJANGO_DEBUG", "False") == "True"
    ALLOWED_HOSTS = ["*"] if DEBUG else ["localhost", "127.0.0.1", "0.0.0.0"]

**Dev mode** (``make start-dev``): sets ``DJANGO_DEBUG=True``, uses Django's
built-in runserver with auto-reload. Components are bundled on-the-fly by
esbuild.

**Prod mode** (``make start-prod``): leaves ``DJANGO_DEBUG`` unset (defaults
to ``False``), pre-builds component bundles, collects static files, then serves
through gunicorn.

Static files with WhiteNoise
-----------------------------

With ``DEBUG=False``, Django does not serve static files. The examples use
`WhiteNoise <https://whitenoise.readthedocs.io/>`_ to serve them directly
from the WSGI application:

.. code-block:: python

    MIDDLEWARE = [
        "django.middleware.security.SecurityMiddleware",
        "whitenoise.middleware.WhiteNoiseMiddleware",
        # ...
    ]

WhiteNoise serves files from ``STATIC_ROOT`` (populated by ``collectstatic``)
without needing nginx or a CDN. This includes pre-built wilco bundles, which
are collected via the ``WilcoBundleFinder``.

Running in production mode
--------------------------

.. code-block:: bash

    cd examples/django-unfold
    make setup       # Install deps, migrate, load fixtures
    make start-prod  # Build bundles, collect static, start gunicorn

This runs:

1. ``wilco_build`` — pre-compiles all components into hashed JS files
2. ``collectstatic`` — copies static files (including bundles) to ``STATIC_ROOT``
3. ``gunicorn config.wsgi:application`` — serves the app on the configured port

WilcoBundleFinder
-----------------

The ``WilcoBundleFinder`` is a Django static files finder that discovers
pre-built bundles from ``WILCO_BUILD_DIR``. It must be added explicitly
to ``STATICFILES_FINDERS`` in your settings:

.. code-block:: python

    STATICFILES_FINDERS = [
        "django.contrib.staticfiles.finders.FileSystemFinder",
        "django.contrib.staticfiles.finders.AppDirectoriesFinder",
        "wilco.bridges.django.finders.WilcoBundleFinder",
    ]

During ``collectstatic``, it copies:

- ``bundles/*.js`` files to ``STATIC_ROOT/wilco/bundles/``
- ``manifest.json`` to ``STATIC_ROOT/wilco/manifest.json``

This allows WhiteNoise (or nginx, or any static file server) to serve the
pre-built bundles at ``/static/wilco/bundles/{name}.{hash}.js``.

wilco_build management command
------------------------------

The Django bridge provides a ``wilco_build`` management command as an
alternative to the ``wilco build`` CLI:

.. code-block:: bash

    python manage.py wilco_build [--output DIR]

When ``--output`` is not specified, it uses the ``WILCO_BUILD_DIR`` setting.
The command discovers components using Django's autodiscovery and configured
component sources.

Dependencies
------------

The production setup adds two dependencies to each Django example:

- ``gunicorn`` — production WSGI server
- ``whitenoise`` — static file serving middleware

Both are listed in the example's ``pyproject.toml`` and installed by ``uv sync``.

Example applications
====================

Two complete Django example applications are available:

Django Unfold (``django-unfold/``)
----------------------------------

The `examples/django-unfold/
<https://github.com/msqd/wilco/tree/main/examples/django-unfold>`_ directory
demonstrates Django with the Unfold admin theme:

- Jinja2 template-based rendering with wilco components
- Django Unfold admin with live preview (tabbed interface)
- Django ORM models for products
- Component discovery from Django apps
- Production mode with gunicorn and WhiteNoise

.. code-block:: bash

    cd examples/django-unfold
    make setup       # Install deps, migrate, load fixtures
    make start-dev   # Run development server (DEBUG=True, auto-reload)
    make start-prod  # Run production server (gunicorn, DEBUG=False)

Visit http://localhost:8000 for the store, http://localhost:8000/admin for the admin
(credentials: admin/admin).

Django Vanilla (``django-vanilla/``)
------------------------------------

The `examples/django-vanilla/
<https://github.com/msqd/wilco/tree/main/examples/django-vanilla>`_ directory
demonstrates Django with the standard built-in admin:

- Same features as Django Unfold but with standard admin UI
- ``LivePreviewAdminMixin`` works with both admin themes
- Production mode with gunicorn and WhiteNoise

.. code-block:: bash

    cd examples/django-vanilla
    make setup       # Install deps, migrate, load fixtures
    make start-dev   # Run development server (DEBUG=True, auto-reload)
    make start-prod  # Run production server (gunicorn, DEBUG=False)

Visit http://localhost:8100 for the store, http://localhost:8100/admin for the admin
(credentials: admin/admin).
