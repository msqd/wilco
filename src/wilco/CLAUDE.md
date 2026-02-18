# wilco Python library

Instructions for working with the Python library (`src/wilco/`).

## Structure

```
wilco/
├── __init__.py         # Package exports, version
├── __main__.py         # Development server entry point
├── registry.py         # Component discovery and registration
├── bundler.py          # esbuild integration for bundling TypeScript
├── bridges/            # Framework-specific integrations
│   ├── fastapi/        # FastAPI router factory
│   ├── django/         # Django app with views, widgets, templatetags
│   └── starlette/      # Starlette route factory
└── examples/           # Example components for testing/demos
```

## Commands

```bash
# Run tests
uv run pytest
uv run pytest tests/test_file.py -k "test_name"

# Run development server
uv run python -m wilco

# Format code
uv run ruff format src tests
```

## Adding components

Components are directories with a TypeScript entry point:

```
examples/my_component/
├── index.tsx         # React component (default export)
└── schema.json       # Optional: title, description, props schema
```

The `__init__.py` file is **not required** for component discovery. Components only need an `index.tsx` (or `index.ts`) file. Add `__init__.py` only if the component directory needs to be importable as a Python package.

Components are auto-discovered and available at `/api/bundles/<name>.js`.

## Bridges

Framework integrations are documented separately:

- **FastAPI**: See `docs/fastapi.rst`
- **Django**: See `docs/django.rst`
- **Starlette**: See `docs/starlette.rst`

## Testing

Tests live in `tests/` at the project root. Use pytest:

```bash
uv run pytest                           # Run all tests
uv run pytest -x                        # Stop on first failure
uv run pytest tests/test_bundler.py     # Run specific test file
```

## API endpoints

All bridges expose these endpoints:

- `GET /api/bundles` - List available bundles
- `GET /api/bundles/{name}.js` - Get bundled JavaScript
- `GET /api/bundles/{name}/metadata` - Get component metadata
