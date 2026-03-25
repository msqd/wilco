=====================
Live Preview System
=====================

The live preview system provides real-time component updates as users edit
admin forms. When a field changes, the form data is validated server-side and
the preview re-renders with new props.

This feature is available across all admin integrations: Django admin,
SQLAdmin (FastAPI), Flask-Admin, and Starlette-Admin.

Overview
========

.. mermaid::

   sequenceDiagram
       participant User as Admin User
       participant Form as Form Fields
       participant JS as live-loader.js
       participant API as Validation Endpoint
       participant Preview as Preview Component

       User->>Form: Edit field (blur/change)
       Form->>JS: Input event
       JS->>JS: Debounce (300ms)
       JS->>API: POST form data
       alt Validation success
           API-->>JS: {success: true, props: {...}}
           JS->>Preview: updateComponentProps(newProps)
           Preview->>Preview: React re-render
       else Validation failure
           API-->>JS: {success: false, errors: {...}}
           JS->>Preview: Show error banner
       end

The system consists of four parts:

1. **Preview container** — a ``WilcoComponentWidget`` with ``live=True``
2. **Script injection** — middleware or hooks that inject the live-loader script
3. **Validation endpoint** — server-side form validation that returns component props
4. **Live-loader script** — client-side logic for form monitoring and preview updates

Django implementation
=====================

Django provides the most integrated experience via ``LivePreviewAdminMixin``.

Architecture
------------

.. mermaid::

   graph TD
       A[LivePreviewAdminMixin] --> B[validate_preview endpoint]
       A --> C[WilcoComponentWidget]
       A --> D[preview readonly field]
       C --> E[loader.js]
       C --> F[live-loader.js]
       B --> G[Django Form validation]
       G --> H[get_preview_props]

       style A fill:#e0e7ff,stroke:#4f46e5
       style B fill:#fef3c7,stroke:#d97706
       style H fill:#d1fae5,stroke:#059669

The mixin adds:

- A ``validate_preview/`` URL to the admin's URL patterns
- A ``preview`` readonly field that renders the component widget
- Automatic script injection via the widget's ``Media`` class

Validation flow
---------------

When a form field loses focus:

1. ``live-loader.js`` collects all form data (including CSRF token)
2. POSTs to ``/{admin_url}/{object_id}/validate_preview/``
3. The mixin creates a Django form instance with the POST data
4. If ``form.is_valid()``: calls ``get_preview_props(form.cleaned_data, instance)``
5. Returns ``{"success": true, "props": {...}}``
6. If validation fails: returns ``{"success": false, "errors": {"field": ["message"]}}``

The ``get_preview_props`` method is the only thing you need to implement:

.. code-block:: python

    def get_preview_props(self, form_data, instance=None):
        """Convert validated form data to component props.

        Args:
            form_data: Dictionary of cleaned (validated) field values.
            instance: The existing model instance (when editing).

        Returns:
            Dictionary of props for the component.
        """
        return {
            "name": form_data.get("name", ""),
            "price": float(form_data.get("price", 0)),
        }

Non-Django implementation
=========================

For FastAPI, Flask, and Starlette, the live preview requires three manual pieces:

1. Script injection middleware
2. Validation endpoints
3. Preview UI scripts

Script injection
----------------

An ASGI/WSGI middleware intercepts HTML responses for ``/admin`` routes and
injects preview scripts before ``</body>``:

.. code-block:: python

    INJECT_SCRIPTS = """
    <script src="/wilco-static/wilco/loader.js" defer></script>
    <script src="/static/wilco/admin-preview-inject.js" defer></script>
    <script src="/static/wilco/live-loader-{framework}.js" defer></script>
    </body>"""

The middleware buffers the response body, performs the string replacement, and
adjusts the ``Content-Length`` header.

Validation endpoints
--------------------

Create POST endpoints that receive form data and return component props:

.. code-block:: python

    # Pattern: /admin/{model}/preview and /admin/{model}/{id}/preview
    @router.post("/admin/product/preview")
    async def validate_preview(request):
        form_data = await request.form()
        errors = validate(form_data)
        if errors:
            return {"success": False, "errors": errors}
        props = convert_to_props(form_data)
        return {"success": True, "props": props}

The response format is consistent across all frameworks:

.. code-block:: json

    {"success": true, "props": {"name": "Widget", "price": 19.99}}

.. code-block:: json

    {"success": false, "errors": {"name": ["Name is required"]}}

Image preview
=============

When users select a file in an image field, the live-loader creates a blob URL
for instant client-side preview without uploading:

.. mermaid::

   sequenceDiagram
       participant User as User
       participant Input as File Input
       participant JS as live-loader.js
       participant Preview as Component

       User->>Input: Select image file
       Input->>JS: change event
       JS->>JS: URL.createObjectURL(file)
       JS->>Preview: updateComponentProps({imageUrl: blobUrl})
       Note over Preview: Instant preview<br/>(no upload needed)

The field-to-prop mapping convention is:

- Field named ``image`` → prop ``imageUrl`` receives the blob URL
- Existing images (from the ``instance``) are used as fallback in ``get_preview_props``

UI layout
=========

The ``admin-preview-inject.js`` script creates a two-column layout when it
detects a preview container on the page:

.. code-block:: text

    ┌─────────────────────────┬──────────────┐
    │                         │              │
    │      Admin Form         │   Component  │
    │                         │   Preview    │
    │  Name: [Widget     ]    │              │
    │  Price: [19.99     ]    │   ┌──────┐   │
    │  Description: [...]     │   │ Card │   │
    │                         │   └──────┘   │
    │                         │              │
    └─────────────────────────┴──────────────┘
                              ↕ drag to resize

Features:

- **Resizable sidebar** — drag the handle between form and preview
- **Width persistence** — remembers width per model type (stored as
  ``wilco-preview-width-{type}`` in localStorage)
- **Responsive stacking** — stacks vertically on small screens or when the
  preview exceeds 50% width
- **Toggle button** — switch between sidebar and full-width stacked modes

Debouncing
==========

The live-loader debounces validation requests to avoid overwhelming the server:

- **Delay**: 300ms after the last field change
- **Events monitored**: ``input`` and ``change`` on form fields, ``blur`` on
  text inputs
- **Cancellation**: a new field change cancels any pending validation request

This means rapid typing only triggers one validation after the user pauses.

See also
========

- :doc:`/how-to/django` — Django admin integration guide with ``LivePreviewAdminMixin``
- :doc:`/how-to/fastapi` — FastAPI live preview with ``AdminPreviewMiddleware``
- :doc:`/how-to/flask` — Flask live preview with ``after_request`` hook
- :doc:`/how-to/starlette` — Starlette live preview with ``AdminPreviewMiddleware``
- :doc:`/reference/javascript` — ``window.wilco.updateComponentProps`` API
