# Starlette Example

A Starlette store showcasing wilco integration with Starlette-Admin and live preview.

## Quick Start

```bash
cd examples/starlette
make setup start-dev
```

Open http://localhost:8400 to view the store.

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make start-dev` | Start development server (live bundling, auto-reload) |
| `make start-prod` | Build assets then start in production mode |
| `make build` | Pre-compile wilco component bundles for production |
| `make install` | Install Python dependencies |
| `make setup` | Full setup: install, create database, fixtures |
| `make test` | Run test suite |
| `make clean` | Remove database and cache files |

## Project Structure

```
starlette/
├── app/
│   ├── admin.py         # Starlette-Admin setup with live preview
│   ├── database.py      # SQLAlchemy async configuration
│   ├── fixtures.py      # Load sample data
│   ├── main.py          # Routes, middleware, app startup
│   ├── models.py        # Product model
│   └── widgets.py       # WilcoComponentWidget
└── resources/
    ├── templates/       # Jinja2 templates
    ├── static/          # Static files (CSS, images)
    └── media/           # Product images
```

## Features

- Product listing on homepage
- Product detail pages
- Admin interface with Starlette-Admin and live component preview

## wilco Integration

- **Starlette Bridge**: Uses `create_routes()` from `wilco.bridges.starlette`
- **AdminPreviewMiddleware**: Injects live preview scripts into admin pages
- **Component Registry**: Loads shared components from `common/components/store/`
