# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**wilco** is a framework that enables Python backends to serve isolated React/TypeScript components. Components are defined in the Python codebase alongside their TypeScript implementations, then dynamically bundled with esbuild and loaded by the frontend at runtime.

## Architecture

```
wilco/
├── pyproject.toml              # Python package config
├── src/
│   ├── wilco/                  # Python package (see src/wilco/CLAUDE.md)
│   │   ├── registry.py         # Component discovery
│   │   ├── bundler.py          # esbuild integration
│   │   ├── bridges/            # Framework integrations
│   │   └── examples/           # Example components
│   └── wilcojs/                # JavaScript packages (see src/wilcojs/CLAUDE.md)
│       └── react/              # React frontend
├── tests/                      # Python tests
├── docs/                       # Documentation (RST/Sphinx)
└── examples/                   # Example projects (django-project, etc.)
```

## Commands

### Development (recommended)

```bash
make start    # Start both backend + frontend via overmind
make install  # Install all dependencies (Python + JavaScript)
make test     # Run all tests (backend + frontend)
make help     # Show all available commands
```

### Running services manually

```bash
# Use overmind directly
overmind start

# Or run separately:
# Terminal 1: uv run python -m wilco
# Terminal 2: cd src/wilcojs/react && pnpm dev
```

Open http://localhost:5173

## Documentation

All wilco library documentation lives in `docs/` using reStructuredText (Sphinx):

- `docs/fastapi.rst` - FastAPI bridge integration
- `docs/django.rst` - Django bridge integration
- `docs/specs/` - Component specifications
- `docs/internals/` - Internal architecture

Major features should be mentioned in `README.md` with links to detailed documentation.

## Key concepts

- **Co-located components**: Each component has `index.tsx` and optional `schema.json` (`__init__.py` is optional)
- **Barrel pattern**: Use `index.ts` only for exports; put components in their own files
- **useComponent**: When a component needs another component, use `useComponent` hook instead of direct imports
- **Bridge pattern**: Framework-specific integrations (see `docs/fastapi.rst`, `docs/django.rst`)

## Development guidelines

### Interactive decision making

When adding features, fixing bugs, or writing code, carefully consider the impact and available options. **Always present the user with interactive choices** when there are multiple valid approaches, using AskUserQuestion.

### Testing requirements

All features (frontend and backend) must be tested. Balance test coverage to ensure each test brings value and helps maintain the codebase.

**Critical**:
- Run tests for new features as you add them
- Before considering any work done, run ALL tests: `make test`

### Documentation

- Library internals: Document in `docs/` as RST files
- Major features: Add to `README.md` with links to detailed docs
- See sub-package CLAUDE.md files for specific guidelines

## Sub-package instructions

- **Python library**: See `src/wilco/CLAUDE.md`
- **Frontend/React**: See `src/wilcojs/CLAUDE.md`
