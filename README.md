# wilco

**Server-defined React components for Python backends.**

[![PyPI version](https://img.shields.io/pypi/v/wilco.svg)](https://pypi.org/project/wilco/)
[![Python versions](https://img.shields.io/pypi/pyversions/wilco.svg)](https://pypi.org/project/wilco/)
[![CI](https://github.com/msqd/wilco/actions/workflows/cicd.yml/badge.svg)](https://github.com/msqd/wilco/actions/workflows/cicd.yml)
[![Documentation](https://readthedocs.org/projects/python-wilco/badge/?version=latest)](https://python-wilco.readthedocs.io/)
[![License](https://img.shields.io/badge/license-MSL--1.0-blue.svg)](LICENSE.md)

**Documentation:** [FastAPI Guide](https://python-wilco.readthedocs.io/en/latest/how-to/fastapi.html) | [Django Guide](https://python-wilco.readthedocs.io/en/latest/how-to/django.html) | [Flask Guide](https://python-wilco.readthedocs.io/en/latest/how-to/flask.html) | [Starlette Guide](https://python-wilco.readthedocs.io/en/latest/how-to/starlette.html)

## Features

- **Co-locate components with backend logic** — Keep UI components next to the Python code that powers them
- **No frontend build pipeline** — Components bundled on-the-fly with esbuild when requested
- **Full source map support** — Debug TypeScript directly in browser devtools
- **Component composition** — Components can dynamically load other components
- **Framework agnostic** — Works with FastAPI, Django, Flask, Starlette, or any ASGI/WSGI-compatible framework

## Quick Start

```bash
pip install wilco[fastapi]  # or wilco[django], wilco[flask], wilco[starlette]
```

### Create a component

```
my_components/
└── greeting/
    ├── __init__.py
    ├── index.tsx
    └── schema.json
```

```tsx
// index.tsx
interface GreetingProps {
  name: string;
  formal?: boolean;
}

export default function Greeting({ name, formal = false }: GreetingProps) {
  const message = formal ? `Good day, ${name}.` : `Hey ${name}!`;
  return <p>{message}</p>;
}
```

### Mount the API

```python
from pathlib import Path
from fastapi import FastAPI
from wilco import ComponentRegistry
from wilco.bridges.fastapi import create_router

app = FastAPI()
registry = ComponentRegistry(Path("./my_components"))
app.include_router(create_router(registry), prefix="/api")
```

### Load in React

```tsx
import { useComponent } from '@wilcojs/react';

function App() {
  const Greeting = useComponent('greeting');
  return <Greeting name="World" />;
}
```

For component schemas, composition patterns, and framework-specific guides, see the [documentation](https://python-wilco.readthedocs.io/).

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/bundles` | List available components |
| `GET /api/bundles/{name}.js` | Get bundled JavaScript |
| `GET /api/bundles/{name}/metadata` | Get component metadata |

## Requirements

- Python 3.10+
- Node.js (for esbuild bundling)
- React 18+ on the frontend

## Development

This project follows strict TDD methodology.

```bash
make test    # Run all tests
make docs    # Build documentation
make help    # Show all available commands
```

## License

Makersquad Source License 1.0 — see [LICENSE.md](LICENSE.md) for details.

Free for non-commercial use. Commercial use requires a license.
Contact licensing@makersquad.fr for inquiries.
