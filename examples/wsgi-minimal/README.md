# Minimal WSGI Example

This example demonstrates wilco component integration with a pure WSGI application, without using any web framework.

## Purpose

This example shows how to integrate wilco with the raw WSGI protocol, useful for:
- Understanding how wilco works at the protocol level
- Building custom WSGI applications that need component rendering
- Educational purposes about WSGI and component-based architecture

## Features

- Pure WSGI application (def app(environ, start_response))
- Simple regex-based routing
- Jinja2 template rendering
- Standard library sqlite3 for database access
- wilco component rendering
- No framework dependencies

## What's NOT Included

This is a minimal example and intentionally omits:
- Admin interface (use a full framework for that)
- Live preview (requires framework support)
- Form handling
- Authentication/authorization

## Quick Start

```bash
# Install dependencies
make install

# Set up database with fixtures
make setup

# Start the server (default port 8400)
make start

# Or use a custom port
HTTP_PORT=9000 make start
```

Visit http://localhost:8400 to see the product list.

## Project Structure

```
wsgi-minimal/
├── app/
│   ├── __init__.py     # Package init
│   ├── wsgi.py         # WSGI application and routes
│   ├── database.py     # sqlite3 database operations
│   ├── models.py       # Product dataclass
│   ├── routes.py       # Simple regex router
│   └── templates.py    # Jinja2 template rendering
├── resources/
│   ├── templates/      # Jinja2 templates
│   │   ├── base.html
│   │   ├── product_list.html
│   │   ├── product_detail.html
│   │   └── 404.html
│   ├── static/         # Static files
│   └── media/          # Product images
├── Makefile
└── pyproject.toml
```

## How It Works

### WSGI Application

The core is a pure WSGI callable in `app/wsgi.py`:

```python
def app(environ: dict, start_response: Callable) -> Iterable[bytes]:
    method = environ["REQUEST_METHOD"]
    path = environ["PATH_INFO"]
    # Route handling...
    start_response(status, headers)
    return [body]
```

### Component Rendering

Components are rendered server-side using the wilco registry:

```python
from wilco import ComponentRegistry

registry = ComponentRegistry()
registry.discover_from_path(COMPONENTS_PATH)

# In route handler
product_html = registry.render("product", {"name": "...", "price": 9.99})
```

### Database

Uses the standard library sqlite3 for synchronous database access:

```python
with get_connection() as conn:
    cursor = conn.execute("SELECT * FROM products")
    rows = cursor.fetchall()
```

## Comparison to Framework Examples

| Feature | WSGI Minimal | Django | Flask |
|---------|--------------|--------|-------|
| Protocol | WSGI | WSGI | WSGI |
| Routing | Regex | Django | Flask |
| Admin | None | Unfold | Flask-Admin |
| Live Preview | No | Yes | No |
| Async | No | No | No |
