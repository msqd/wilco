# Django Ecommerce Example

A simple Django ecommerce site showcasing wilco integration.

## Quick Start

```bash
cd examples/django-project
uv sync
make setup
make start
```

Open http://localhost:8000 to view the store.

**Default users:**
- Admin: `admin` / `admin` (access at http://localhost:8000/admin/)
- Demo: `demo` / `demo`

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make start` | Start development server (default) |
| `make setup` | Full setup: migrate, load fixtures, create users |
| `make migrate` | Run database migrations |
| `make fixtures` | Load sample product data |
| `make users` | Create admin and demo users |
| `make clean` | Remove database and cache files |

## Project Structure

```
django-project/
├── ecommerce/          # Django project settings
├── store/              # Store app (products, views)
├── templates/          # HTML templates
│   ├── base.html
│   └── store/
│       ├── product_list.html
│       └── product_detail.html
└── fixtures/           # Sample data
```

## Features

- Product listing on homepage
- Product detail pages
- Admin interface for managing products

## wilco Integration

This example demonstrates how to integrate wilco components into a Django
application. The product cards currently show placeholder content that will
be replaced with wilco-powered React components.
