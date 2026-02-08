# Examples Directory

This directory contains example applications demonstrating wilco integration with different Python web frameworks.

## Purpose

The examples serve as:
1. **Reference implementations** showing how to integrate wilco with various frameworks
2. **Test beds** for validating wilco functionality across different environments
3. **Documentation companions** that match the how-to guides in `docs/how-to/`

## Specifications

See `common/specifications.rst` for the complete specification of features all examples must implement:
- Product data model (id, name, description, price, image, created_at)
- 6 Space Quest-themed sample products
- Product listing and detail pages
- Admin interface for CRUD operations
- Makefile with `install`, `setup`, `test`, and `start` targets
- HTTP_PORT environment variable support

## Example Applications

### Django (`django/`)

Server-rendered templates with Django Unfold admin and live preview.

- **Docs**: `docs/how-to/django.rst`
- **Admin**: Django Unfold with `LivePreviewAdminMixin`
- **Frontend**: Jinja2 templates with `WilcoComponentWidget`

### FastAPI (`fastapi/`)

Separate React SPA frontend with SQLAdmin backend.

- **Docs**: `docs/how-to/fastapi.rst`
- **Admin**: SQLAdmin (no live preview)
- **Frontend**: Vite + React 19 application

### Starlette (`starlette/`)

Server-rendered templates with Starlette-Admin and live preview.

- **Docs**: `docs/how-to/starlette.rst`
- **Admin**: Starlette-Admin with live preview
- **Frontend**: Jinja2 templates with wilco components

## Shared Resources (`common/`)

- `components/store/` - Shared wilco components (product, product_list, product_preview)
- `fixtures/images/products/` - Product images
- `fixtures/sample_products.json` - Common fixture data

## Running Examples

```bash
# Single example
cd examples/django && make setup && make start

# All examples simultaneously (requires overmind)
cd examples && make setup && make start
```

## Keeping Examples in Sync

**IMPORTANT**: Examples must stay synchronized with documentation:

1. Features described in `docs/how-to/*.rst` must work in the corresponding example
2. Changes to shared components (`common/components/`) affect Django and Starlette
3. The comparison matrix in `common/specifications.rst` must reflect actual capabilities

When modifying an example:
1. Test the change locally with `make start`
2. Verify with Chrome DevTools (see below)
3. Update corresponding documentation if behavior changes
4. Update `common/specifications.rst` if features change

## Testing with Chrome DevTools

Since wilco relies on JavaScript for component rendering, **use a real browser** for testing:

```bash
# Chrome DevTools MCP can be used to:
# - Navigate to pages and verify component rendering
# - Check console for JavaScript errors
# - Inspect network requests to /api/bundles/*.js
# - Verify live preview updates on form input

# Example workflow:
# 1. Start the example: make start
# 2. Use chrome-devtools MCP tools to:
#    - navigate_page to http://localhost:8000/
#    - take_snapshot to verify DOM structure
#    - list_console_messages to check for errors
#    - list_network_requests to verify API calls
```

This is especially useful for:
- Debugging component loading failures
- Verifying live preview functionality in admin
- Testing form validation and error display
- Checking responsive layouts and styling

## Port Configuration

| Example   | Default Port | Additional Ports |
|-----------|--------------|------------------|
| Django    | 8000         | -                |
| FastAPI   | 8000         | 8001 (frontend)  |
| Starlette | 8000         | -                |

When running all examples: Django:8000, FastAPI:8100-8101, Starlette:8200
