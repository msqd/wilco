# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**wilco** is a proof-of-concept framework that enables Python backends to serve isolated React/TypeScript components to a Vite-based frontend. Components are defined in the Python codebase alongside their TypeScript implementations, then dynamically bundled with esbuild and loaded by the frontend at runtime.

## Architecture

```
wilco/
├── pyproject.toml              # Python package config
├── uv.lock
├── src/
│   ├── wilco/                  # Python package
│   │   ├── __init__.py
│   │   ├── __main__.py         # Development server entry point
│   │   ├── registry.py         # Component discovery
│   │   ├── bundler.py          # esbuild integration
│   │   ├── bridges/
│   │   │   ├── __init__.py
│   │   │   └── fastapi.py      # Mountable FastAPI router
│   │   └── examples/           # Example components
│   └── wilcojs/                # JavaScript/TypeScript packages
│       └── react/              # React frontend app
│           ├── package.json
│           ├── index.html
│           ├── src/
│           │   ├── App.tsx
│           │   ├── api/
│           │   │   └── bundles.ts
│           │   └── loader/
│           │       ├── ServerComponent.tsx
│           │       ├── useComponent.ts
│           │       └── wilco.ts
│           ├── tsconfig.json
│           └── vite.config.ts
├── tests/                      # Python tests
└── docs/
```

### Key Concepts

- **Co-located components**: Each component has a Python package with `__init__.py`, `index.tsx` (React implementation), and optional `schema.json` (metadata/props)
- **Dynamic bundling**: Backend uses esbuild (from frontend's node_modules) to bundle TypeScript components on-demand
- **Runtime loading**: Frontend transforms ESM imports to use `window.__MODULES__`, then executes bundled code via `new Function()`
- **Bridge pattern**: The `wilco.bridges.fastapi` module provides a mountable router factory for easy integration

### API Endpoints

- `GET /api/bundles` - List available bundles (names only)
- `GET /api/bundles/{name}.js` - Get bundled JavaScript for a component
- `GET /api/bundles/{name}/metadata` - Get component metadata (title, description, props)

## Commands

### Backend (Python/uv)

```bash
# Install dependencies
uv sync

# Run development server (port 8000)
uv run python -m wilco

# Run tests
uv run pytest
uv run pytest tests/test_file.py -k "test_name"
```

### Frontend (Vite/pnpm)

```bash
cd src/wilcojs/react

# Install dependencies
pnpm install

# Run development server (port 5173, proxies /api to backend)
pnpm dev

# Type checking
pnpm typecheck

# Build for production
pnpm build
```

### Running the POC

**Option 1: Using Procfile (recommended)**
```bash
# Install a process manager (honcho, foreman, or overmind)
pip install honcho  # or: brew install overmind

# Start both services
honcho start        # or: overmind start
```

**Option 2: Manual**
```bash
# Terminal 1
uv run python -m wilco

# Terminal 2
cd src/wilcojs/react && pnpm dev
```

Open http://localhost:5173

### Hot Reloading

- **Backend**: uvicorn runs with `reload=True`, auto-reloads on Python file changes
- **Frontend**: Vite provides HMR (Hot Module Replacement) for instant updates

## Adding New Components

1. Create a component package: `src/wilco/examples/<name>/` (or your own components directory)
2. Add `__init__.py` (can be empty)
3. Add `index.tsx` with a default export React component
4. Optionally add `schema.json` with title, description, and props schema
5. Component will be auto-discovered and available at `/api/bundles/<name>.js`

## Using the Bridge Pattern

The `wilco.bridges.fastapi` module provides a `create_router()` factory for integrating with any FastAPI app:

```python
from fastapi import FastAPI
from wilco import ComponentRegistry
from wilco.bridges.fastapi import create_router

app = FastAPI()
registry = ComponentRegistry(Path("./my_components"))
app.include_router(create_router(registry), prefix="/api")
```

## Frontend State Management

Uses `@tanstack/react-query` for server state:
- `useBundles()` - Fetch list of available bundles
- `useBundleMetadata(name)` - Fetch metadata for a specific bundle
- `useBundleCode(name)` - Fetch bundled JavaScript code

Hooks are defined in `src/wilcojs/react/src/api/bundles.ts`.
