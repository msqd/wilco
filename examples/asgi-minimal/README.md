# Minimal ASGI Example

This example demonstrates wilco component integration with a pure ASGI application, without using any web framework.

## Purpose

This example shows how to integrate wilco with the raw ASGI protocol, useful for:
- Understanding how wilco works at the protocol level
- Building custom ASGI applications that need component rendering
- Educational purposes about ASGI and component-based architecture

## Features

- Pure ASGI application (async def app(scope, receive, send))
- Simple regex-based routing
- Jinja2 template rendering
- aiosqlite for async database access
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

# Start the server (default port 8300)
make start

# Or use a custom port
HTTP_PORT=9000 make start
```

Visit http://localhost:8300 to see the product list.

## Project Structure

```
asgi-minimal/
├── app/
│   ├── __init__.py     # Package init
│   ├── asgi.py         # ASGI application and routes
│   ├── database.py     # aiosqlite database operations
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

### ASGI Application

The core is a pure ASGI callable in `app/asgi.py`:

```python
async def app(scope: dict, receive, send) -> None:
    if scope["type"] != "http":
        return
    # Route handling...
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

Uses aiosqlite for async SQLite access:

```python
async with await get_connection() as conn:
    cursor = await conn.execute("SELECT * FROM products")
    rows = await cursor.fetchall()
```

## Comparison to Framework Examples

| Feature | ASGI Minimal | Starlette | FastAPI |
|---------|--------------|-----------|---------|
| Protocol | ASGI | ASGI | ASGI |
| Routing | Regex | Starlette | FastAPI |
| Admin | None | Starlette-Admin | SQLAdmin |
| Live Preview | No | Yes | No |
| Async | Yes | Yes | Yes |
