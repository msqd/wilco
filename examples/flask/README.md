# Flask Example

A simple Flask store showcasing wilco integration with Flask-Admin.

## Quick Start

```bash
cd examples/flask
make setup start
```

Open http://localhost:8002 to view the store.

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make start` | Start development server (default) |
| `make install` | Install Python dependencies |
| `make setup` | Full setup: install, create database, fixtures |
| `make clean` | Remove database and cache files |

## Project Structure

```
flask/
├── app/
│   ├── __init__.py      # App factory
│   ├── admin.py         # Flask-Admin setup
│   ├── database.py      # SQLAlchemy configuration
│   ├── fixtures.py      # Load sample data
│   ├── main.py          # Routes, app startup
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
- Admin interface with Flask-Admin (no live preview)

## Admin Interface

Flask-Admin provides basic CRUD operations for products at `/admin/`.

Note: Unlike Django Unfold and Starlette-Admin examples, Flask-Admin does not
have live preview support for wilco components.

## wilco Integration

This example demonstrates how to integrate wilco components into a Flask
application:

- **Flask Bridge**: Uses `create_blueprint()` from `wilco.bridges.flask`
- **WilcoComponentWidget**: Renders components in Jinja2 templates
- **Component Registry**: Loads shared components from `common/components/store/`
