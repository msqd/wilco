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

Global components
-----------------

You can also set a global components directory:

.. code-block:: python

    # settings.py
    WILCO_COMPONENTS_DIR = BASE_DIR / "shared_components"

Components in this directory are not prefixed:
``shared_components/button/`` becomes ``button``.

Settings
========

``WILCO_COMPONENTS_DIR``
    Path to a global components directory. Optional.

``WILCO_AUTODISCOVER``
    Whether to auto-discover components from Django apps (default: ``True``).

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

To manually clear the cache:

.. code-block:: python

    from wilco.bridges.django.views import clear_bundle_cache

    # Clear all
    clear_bundle_cache()

    # Clear specific component
    clear_bundle_cache("store:product")

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


Example application
===================

A complete example application is available in ``examples/django/``. It demonstrates:

- Jinja2 template-based rendering with wilco components
- Django Unfold admin with live preview
- Django ORM models for products
- Component discovery from Django apps

To run the example:

.. code-block:: bash

    cd examples/django
    make setup   # Install deps, migrate, load fixtures
    make start   # Run development server

Visit http://localhost:8000 for the store, http://localhost:8000/admin for the admin
(credentials: admin/admin).
