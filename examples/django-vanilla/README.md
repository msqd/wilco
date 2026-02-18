# Django Vanilla Example

A simple Django store showcasing wilco integration with standard Django admin (no Unfold theme).

## Quick Start

```bash
cd examples/django-vanilla
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
| `make clean` | Remove database and cache files |

## Project Structure

```
django-vanilla/
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
- Admin interface with live component preview (standard Django admin)

## Comparison with Django Unfold

This example uses Django's built-in admin, while the `django-unfold/` example uses
the Unfold admin theme for a modern UI. Both support live preview through the
`LivePreviewAdminMixin`.

## wilco Integration

This example demonstrates how to integrate wilco components into a Django
application:

- **Admin Preview**: Uses `LivePreviewAdminMixin` for real-time component updates
- **Component Widget**: `WilcoComponentWidget` renders components in admin
- **Per-App Components**: Components in `apps/store/components/` are prefixed as `store:`
