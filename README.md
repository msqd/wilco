# wilco

**Server-defined React components for Python backends.**

Wilco lets you define React components alongside your Python code and serve them dynamically to any frontend. Components are bundled on-demand with esbuild and loaded at runtime—no build step required for your component library.

## Why wilco?

- **Co-locate components with backend logic**: Keep your UI components next to the Python code that powers them
- **No frontend build pipeline**: Components are bundled on-the-fly when requested
- **Full source map support**: Debug your TypeScript directly in browser devtools
- **Component composition**: Components can dynamically load other components
- **Framework agnostic**: Mount the API router in any FastAPI (or compatible) app

## Quick start

### Installation

```bash
# Core library only
pip install wilco

# With FastAPI support
pip install wilco[fastapi]

# With Django support
pip install wilco[django]

# With both frameworks
pip install wilco[fastapi,django]
```

See [FastAPI Integration](docs/fastapi.rst) and [Django Integration](docs/django.rst) for framework-specific guides.

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

```json
{
  "title": "Greeting",
  "description": "A friendly greeting component",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "formal": { "type": "boolean", "default": false }
  },
  "required": ["name"]
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

### Load components in React

```tsx
import { useComponent } from '@wilcojs/react';

function App() {
  const Greeting = useComponent('greeting');
  return <Greeting name="World" />;
}
```

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/bundles` | List available components |
| `GET /api/bundles/{name}.js` | Get bundled JavaScript |
| `GET /api/bundles/{name}/metadata` | Get component metadata |

## Component structure

Each component is a Python package with:

| File | Required | Description |
|------|----------|-------------|
| `__init__.py` | Yes | Package marker |
| `index.tsx` | Yes | React component (default export) |
| `schema.json` | No | Props schema and metadata |

Components can include additional `.tsx` files—they're all bundled together.

## Component composition

Components can load other components dynamically:

```tsx
import { useComponent } from '@wilcojs/react';

export default function Dashboard() {
  const Chart = useComponent('chart');
  const Table = useComponent('table');

  return (
    <div>
      <Chart data={...} />
      <Table rows={...} />
    </div>
  );
}
```

## Development server

Run the built-in development server to preview components:

```bash
uv run python -m wilco
```

Then start the frontend:

```bash
cd src/wilcojs/react && pnpm dev
```

Open http://localhost:5173 to browse and test your components.

## Requirements

- Python 3.10+
- Node.js (for esbuild bundling)
- React 18+ on the frontend

## About the name

Named after **Roger Wilco**, the janitor-turned-hero from Sierra's *Space Quest* series. Roger stumbles into saving the galaxy while just trying to do his job. Like its namesake, this framework gets the job done despite the chaos—bridging Python backends with React frontends through dynamic bundling magic.

## License

MIT
