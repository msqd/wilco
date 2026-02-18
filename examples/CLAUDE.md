# Examples Directory

This directory contains example applications demonstrating wilco integration with different Python web frameworks and protocols.

## Purpose

The examples serve as:
1. **Reference implementations** showing how to integrate wilco with various frameworks
2. **Test beds** for validating wilco functionality across different environments
3. **Documentation companions** that match the how-to guides in `docs/how-to/`
4. **Educational resources** for understanding ASGI/WSGI protocol integration

## Specifications

See `common/specifications.rst` for the complete specification of features all examples must implement:
- Product data model (id, name, description, price, image, created_at)
- 6 Space Quest-themed sample products
- Product listing and detail pages
- Admin interface for CRUD operations (full frameworks only)
- Makefile with `install`, `setup`, `test`, and `start` targets
- HTTP_PORT environment variable support

## Example Applications

### Full Framework Examples

These examples include complete admin interfaces and demonstrate production-ready patterns.

#### Django Unfold (`django-unfold/`)

Server-rendered templates with Django Unfold admin and live preview.

- **Docs**: `docs/how-to/django.rst`
- **Admin**: Django Unfold with `LivePreviewAdminMixin`
- **Frontend**: Jinja2 templates with `WilcoComponentWidget`
- **Protocol**: WSGI
- **Port**: 8000

#### Django Vanilla (`django-vanilla/`)

Server-rendered templates with standard Django admin and live preview.

- **Admin**: Standard Django admin with `LivePreviewAdminMixin`
- **Frontend**: Jinja2 templates with `WilcoComponentWidget`
- **Protocol**: WSGI
- **Port**: 8100

#### Flask (`flask/`)

Flask application with Flask-Admin backend and live preview.

- **Admin**: Flask-Admin with live preview
- **Frontend**: Jinja2 templates with wilco components
- **Protocol**: WSGI
- **Port**: 8200

#### FastAPI (`fastapi/`)

Separate React SPA frontend with SQLAdmin backend.

- **Docs**: `docs/how-to/fastapi.rst`
- **Admin**: SQLAdmin with live preview
- **Frontend**: Vite + React 19 application (proxies API)
- **Protocol**: ASGI
- **Ports**: 8300 (frontend), 8301 (API)

#### Starlette (`starlette/`)

Server-rendered templates with Starlette-Admin and live preview.

- **Docs**: `docs/how-to/starlette.rst`
- **Admin**: Starlette-Admin with live preview
- **Frontend**: Jinja2 templates with wilco components
- **Protocol**: ASGI
- **Port**: 8400

### Minimal Protocol Examples

These examples demonstrate wilco integration at the protocol level, without any web framework.
They are intended for educational purposes and for applications that need minimal dependencies.

**What's included**: Product listing and detail pages with wilco component rendering.

**What's NOT included**: Admin interface, live preview, form handling, authentication.

#### ASGI Minimal (`asgi-minimal/`)

Pure ASGI application demonstrating async protocol integration.

- **Protocol**: ASGI (async def app(scope, receive, send))
- **Database**: aiosqlite (async SQLite)
- **Templates**: Jinja2
- **Port**: 8500

#### WSGI Minimal (`wsgi-minimal/`)

Pure WSGI application demonstrating sync protocol integration.

- **Protocol**: WSGI (def app(environ, start_response))
- **Database**: sqlite3 (standard library)
- **Templates**: Jinja2
- **Port**: 8600

## Protocol Comparison Matrix

| Example | Protocol | Async | Admin | Live Preview | Framework |
|---------|----------|-------|-------|--------------|-----------|
| Django Unfold | WSGI | No | Unfold | Yes | Django |
| Django Vanilla | WSGI | No | Built-in | Yes | Django |
| Flask | WSGI | No | Flask-Admin | Yes | Flask |
| FastAPI | ASGI | Yes | SQLAdmin | Yes | FastAPI |
| Starlette | ASGI | Yes | Starlette-Admin | Yes | Starlette |
| ASGI Minimal | ASGI | Yes | None | No | None |
| WSGI Minimal | WSGI | No | None | No | None |

## Shared Resources (`common/`)

- `components/store/` - Shared wilco components (product, product_list, product_preview)
- `fixtures/images/products/` - Product images
- `fixtures/sample_products.json` - Common fixture data

## Running Examples

```bash
# Single example
cd examples/django-unfold && make setup && make start

# All examples simultaneously (requires overmind)
cd examples && make setup && make start
```

## Port Configuration

Ports are allocated in 100 increments to leave room for additional services per example.

| Example | Default Port | Additional Ports |
|---------|--------------|------------------|
| Django Unfold | 8000 | - |
| Django Vanilla | 8100 | - |
| Flask | 8200 | - |
| FastAPI | 8300 (frontend) | 8301 (API) |
| Starlette | 8400 | - |
| ASGI Minimal | 8500 | - |
| WSGI Minimal | 8600 | - |

## Keeping Examples in Sync

**IMPORTANT**: Examples must stay synchronized with documentation:

1. Features described in `docs/how-to/*.rst` must work in the corresponding example
2. Changes to shared components (`common/components/`) affect Django, Flask, and Starlette
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

## E2E Testing

Automated end-to-end tests using Playwright are available in `e2e/`. See `e2e/README.md` for full documentation.

### Quick Start

```bash
cd e2e
pnpm install && pnpm install-browsers
pnpm test                    # Run all tests
pnpm test:django-unfold      # Run Django Unfold tests only
pnpm test:django-vanilla     # Run Django Vanilla tests only
pnpm test:flask              # Run Flask tests only
pnpm test:fastapi            # Run FastAPI tests only
pnpm test:starlette          # Run Starlette tests only
pnpm test:asgi-minimal       # Run ASGI Minimal tests only
pnpm test:wsgi-minimal       # Run WSGI Minimal tests only
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `HEADED=1` | Show browser window during tests |
| `PWDEBUG=1` | Enable Playwright Inspector for debugging |
| `WILCO_E2E_FRAMEWORK` | Specify which framework(s) to test |

### Test Coverage

**Full framework examples** have tests for:
- Product list page (6 products displayed)
- Product detail page (full details, 404 handling)
- Admin panel accessibility

**Minimal examples** have tests for:
- Product list page (6 products displayed)
- Product detail page (full details, 404 handling)

(Minimal examples do not have admin tests since they have no admin interface.)
