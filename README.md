# wilco

**Server-defined React components for Python backends.**

[![PyPI version](https://img.shields.io/pypi/v/wilco.svg)](https://pypi.python.org/pypi/wilco)
[![Python versions](https://img.shields.io/pypi/pyversions/wilco.svg)](https://pypi.python.org/pypi/wilco)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Documentation:** [FastAPI Guide](docs/fastapi.rst) | [Django Guide](docs/django.rst)

## Features

- **Co-locate components with backend logic** — Keep UI components next to the Python code that powers them
- **No frontend build pipeline** — Components bundled on-the-fly with esbuild when requested
- **Full source map support** — Debug TypeScript directly in browser devtools
- **Component composition** — Components can dynamically load other components
- **Framework agnostic** — Works with FastAPI, Django, or any ASGI-compatible framework

## Quick Start

```bash
pip install wilco[fastapi]  # or wilco[django]
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

For component schemas, composition patterns, and framework-specific guides, see the [documentation](docs/).

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

This project follows strict TDD methodology. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

```bash
make test    # Run all tests
make docs    # Build documentation
make help    # Show all available commands
```

## License

MIT License — see [LICENSE](LICENSE) for details.
