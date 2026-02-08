wilco - Server-Defined React Components
=======================================

.. warning::

   **Experimental Software**

   wilco is experimental software in active development. Breaking changes may occur
   until version 1.0. Use with care in production environments.

**wilco** is a framework that enables Python backends to serve isolated React/TypeScript components.
Components are defined in the Python codebase alongside their TypeScript implementations,
then dynamically bundled with esbuild and loaded by the frontend at runtime.

.. toctree::
   :maxdepth: 1
   :caption: Tutorials

   tutorials/index

.. toctree::
   :maxdepth: 1
   :caption: How-To Guides

   how-to/fastapi
   how-to/django
   how-to/starlette

.. toctree::
   :maxdepth: 1
   :caption: Reference

   reference/components
   reference/javascript

.. toctree::
   :maxdepth: 1
   :caption: Explanation

   explanation/standalone-loader

Features
--------

- **Co-located components** — Keep UI components next to the Python code that powers them
- **No frontend build pipeline** — Components bundled on-the-fly with esbuild when requested
- **Full source map support** — Debug TypeScript directly in browser devtools
- **Component composition** — Components can dynamically load other components via ``useComponent``
- **Framework agnostic** — Works with FastAPI, Django, Starlette, or any ASGI-compatible framework

Quick example
-------------

Create a component directory with Python and TypeScript files:

.. code-block:: text

   my_components/
   └── greeting/
       ├── __init__.py
       ├── index.tsx
       └── schema.json

Write your React component:

.. code-block:: tsx

   // index.tsx
   interface GreetingProps {
     name: string;
     formal?: boolean;
   }

   export default function Greeting({ name, formal = false }: GreetingProps) {
     const message = formal ? `Good day, ${name}.` : `Hey ${name}!`;
     return <p>{message}</p>;
   }

Mount the API in your Python application:

.. code-block:: python

   # FastAPI example
   from fastapi import FastAPI
   from wilco.bridges.fastapi import create_api_router
   from wilco import ComponentRegistry

   app = FastAPI()
   registry = ComponentRegistry("my_components")
   app.include_router(create_api_router(registry), prefix="/api")

Load components in the frontend:

.. code-block:: tsx

   import { useComponent } from '@wilcojs/react';

   function App() {
     const Greeting = useComponent('greeting');
     return <Greeting name="World" />;
   }

Documentation
-------------

.. list-table::
   :widths: 25 75
   :header-rows: 0

   * - :doc:`tutorials/index`
     - Learning-oriented lessons to get started with wilco
   * - :doc:`how-to/index`
     - Goal-oriented guides for specific tasks (FastAPI, Django, Starlette)
   * - :doc:`reference/index`
     - Technical reference for APIs and specifications
   * - :doc:`explanation/index`
     - Background and architectural explanations

API endpoints
-------------

All framework integrations expose these endpoints:

.. list-table::
   :widths: 40 60
   :header-rows: 1

   * - Endpoint
     - Description
   * - ``GET /api/bundles``
     - List available components
   * - ``GET /api/bundles/{name}.js``
     - Get bundled JavaScript for a component
   * - ``GET /api/bundles/{name}/metadata``
     - Get component metadata (schema, props)

Quick links
-----------

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
