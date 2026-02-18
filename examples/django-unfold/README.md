# Django Example

A simple Django store showcasing wilco integration.

## Quick Start

```bash
cd examples/django
make setup start
```

Open http://localhost:8000 to view the store.

**Default users:**
- Admin: `admin` / `admin` (access at http://localhost:8000/admin/)
- Demo: `demo` / `demo`

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make start` | Start development server (default) |
| `make install` | Install Python dependencies |
| `make setup` | Full setup: install, migrate, fixtures, users |
| `make migrate` | Run database migrations |
| `make fixtures` | Load sample product data |
| `make users` | Create admin and demo users |
| `make clean` | Remove database and cache files |

## Project Structure

```
django/
├── config/             # Django project settings
├── apps/
│   └── store/          # Store app (products, views, components)
└── resources/
    ├── templates/      # HTML templates
    ├── static/         # Static files (CSS, images)
    ├── media/          # User uploads
    └── fixtures/       # Sample data
```

## Features

- Product listing on homepage
- Product detail pages
- Admin interface with live component preview

## wilco Integration

This example demonstrates how to integrate wilco components into a Django
application:

- **Admin Preview**: Uses `LivePreviewAdminMixin` for real-time component updates
- **Component Widget**: `WilcoComponentWidget` renders components in admin
- **Per-App Components**: Components in `apps/store/components/` are prefixed as `store:`
