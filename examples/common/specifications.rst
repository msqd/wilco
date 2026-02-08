Example Applications Specifications
====================================

This document describes the common functionalities demonstrated by all wilco example applications.
Each example implements a **Space Quest-themed e-commerce store** showcasing wilco's component
integration capabilities.

Common Features
---------------

All examples implement the following core features:

Data Model
~~~~~~~~~~

**Product Model**

.. list-table::
   :header-rows: 1
   :widths: 20 20 60

   * - Field
     - Type
     - Description
   * - id
     - Integer
     - Primary key
   * - name
     - String (200)
     - Product name
   * - description
     - Text
     - Product description (optional)
   * - price
     - Decimal (10,2)
     - Product price in USD
   * - image
     - String/ImageField
     - Path to product image
   * - created_at
     - DateTime
     - Creation timestamp

Sample Data
~~~~~~~~~~~

All examples use the same 6 Space Quest-themed products:

1. **Space Quest T-Shirt** ($29.99) - Classic design on cotton t-shirt
2. **Janitor's Mop** ($19.99) - Roger Wilco approved cleaning tool
3. **Buckazoid Coin** ($9.99) - Authentic replica currency
4. **Xenon Army Knife** ($49.99) - Multi-tool with dehydrated towel
5. **Astro Chicken Game** ($14.99) - Legendary arcade cartridge
6. **Monolith Burger Gift Card** ($25.00) - Galaxy's finest fast food

Product images are shared from ``examples/common/fixtures/images/products/``.

User-Facing Features
~~~~~~~~~~~~~~~~~~~~

**Product Listing Page** (``/``)

- Displays all products in a grid layout
- Each product shows: image, name, price
- Click navigates to product detail

**Product Detail Page** (``/product/<id>/``)

- Full product information
- Large image display
- Complete description
- "Add to Cart" button (placeholder)
- Back link to listing

Admin Features
~~~~~~~~~~~~~~

All examples provide an admin interface for managing products:

- List products with thumbnail, name, price
- Create new products
- Edit existing products
- Search by name/description
- Sort by various fields

Example-Specific Implementations
--------------------------------

Django Example
~~~~~~~~~~~~~~

**Frontend Approach:** Server-rendered templates with embedded wilco components

- Uses Jinja2 templates (``base.html``, ``product_list.html``, ``product_detail.html``)
- Components rendered via ``WilcoComponentWidget``
- Single server process

**Admin:** Django Unfold theme

- ``LivePreviewAdminMixin`` for real-time component preview
- Tabbed interface (Details, Preview)
- Side-by-side list/detail mode preview

**Wilco Components:**

- ``store:product`` - Single product (list/detail modes)
- ``store:product_list`` - Product grid using ``useComponent``
- ``store:product_preview`` - Admin preview component

FastAPI Example
~~~~~~~~~~~~~~~

**Frontend Approach:** Separate React SPA (Vite + React 19)

- Full React application with React Router
- Fetches data via REST API (``/api/products``)
- Tailwind CSS styling
- Separate dev server (port 5173)

**Admin:** SQLAdmin

- Web-based admin interface
- CRUD operations for products
- No live wilco preview

**API Endpoints:**

- ``GET /api/products`` - List all products
- ``GET /api/products/{id}`` - Get single product

Starlette Example
~~~~~~~~~~~~~~~~~

**Frontend Approach:** Server-rendered templates with Jinja2 (like Django)

- Uses Jinja2 templates (``base.html``, ``product_list.html``, ``product_detail.html``)
- Components rendered via wilco Starlette bridge
- Single server process

**Admin:** Starlette-Admin

- Native Starlette admin package
- SQLAlchemy integration
- Modern UI with CRUD operations
- Wilco live preview integration (like Django's ``LivePreviewAdminMixin``)

**Wilco Components:** Uses shared components from ``examples/common/components/store/``

- ``store:product`` - Single product (list/detail modes)
- ``store:product_list`` - Product grid using ``useComponent``
- ``store:product_preview`` - Admin preview component

Shared Resources
----------------

**Location:** ``examples/common/``

Components
~~~~~~~~~~

Shared wilco components used by Django and Starlette examples:

``components/store/product/``
    Single product component with list/detail modes

``components/store/product_list/``
    Product grid using ``useComponent`` hook

``components/store/product_preview/``
    Admin preview showing list and detail modes side-by-side

Fixtures
~~~~~~~~

- ``fixtures/images/products/`` - Product images (6 JPG files)
- ``fixtures/sample_products.json`` - Common product data (framework-agnostic JSON)

Setup Requirements
------------------

All examples must provide these Makefile targets:

``make install``
    Sync virtual environment using uv (and pnpm for JS dependencies if needed)

``make setup``
    Full setup: install dependencies, run migrations, load fixtures, create users

``make test``
    Run the test suite

``make start``
    Start the development server (default target)

Port Configuration
~~~~~~~~~~~~~~~~~~

All examples support the ``HTTP_PORT`` environment variable (default: 8000).

When an example requires multiple ports (e.g., backend + frontend dev server),
additional ports increment from the base:

- ``HTTP_PORT`` - Main server port (default: 8000)
- ``FRONTEND_PORT`` - Frontend dev server (default: HTTP_PORT + 1)
- Additional services increment further as needed

**Default Ports:**

- **Django:** ``HTTP_PORT`` (8000)
- **FastAPI:** ``HTTP_PORT`` (8000) + ``FRONTEND_PORT`` (8001)
- **Starlette:** ``HTTP_PORT`` (8000)

Running All Examples
~~~~~~~~~~~~~~~~~~~~

From ``examples/`` directory:

.. code-block:: bash

    # Run all examples simultaneously (uses overmind)
    make start

    # Or with custom base ports
    make start DJANGO_PORT=8000 FASTAPI_PORT=8100 STARLETTE_PORT=8200

Each example runs on its own port range to avoid conflicts.

Implementation Notes
--------------------

Fixture Loading
~~~~~~~~~~~~~~~

The common fixture (``examples/common/fixtures/sample_products.json``) uses a flat JSON format:

.. code-block:: json

    [
      {
        "id": 1,
        "name": "Space Quest T-Shirt",
        "description": "...",
        "price": "29.99",
        "image": "products/teeshirt.jpg",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]

- **FastAPI/Starlette:** Load directly into SQLAlchemy models
- **Django:** Transform to Django fixture format or use custom management command

Component Registration
~~~~~~~~~~~~~~~~~~~~~~

Examples configure wilco to discover shared components:

- Set ``WILCO_COMPONENTS_DIR`` or registry path to ``examples/common/components``
- Components are namespaced as ``store:product``, ``store:product_list``, etc.
- The ``useComponent`` hook enables dynamic component loading within other components

Comparison Matrix
-----------------

.. list-table::
   :header-rows: 1
   :widths: 25 25 25 25

   * - Feature
     - Django
     - FastAPI
     - Starlette
   * - Frontend
     - Jinja2 templates
     - React SPA
     - Jinja2 templates
   * - Admin
     - Unfold
     - SQLAdmin
     - Starlette-Admin
   * - Live Preview
     - Yes
     - No
     - Yes
   * - ORM
     - Django ORM
     - SQLAlchemy
     - SQLAlchemy
   * - Processes
     - 1
     - 2
     - 1
   * - Components
     - Local (apps/store/)
     - Library examples
     - Shared (common/)

Migration Notes
---------------

The Django example currently has its own components in ``apps/store/components/``.
These are identical to the shared components in ``examples/common/components/store/``.
A future refactoring should update Django to use the shared components.
