=======================
Component Specification
=======================

Overview
========

Wilco components are server-defined React/TypeScript UI elements that can be
dynamically loaded and rendered by the frontend. This specification defines
the structure, discovery, bundling, and composition of components.

Design principles
-----------------

1. **Simplicity**: Minimal required files, sensible defaults
2. **Testability**: Each component is isolated and independently testable
3. **Debuggability**: Full source maps, clear error messages, traceable paths
4. **Reusability**: Components can compose other components seamlessly
5. **Flexibility**: Optional features enhance but don't complicate basics

Component structure
===================

Directory layout
----------------

Each component is a Python package (directory with ``__init__.py``) located
under the components directory:

.. code-block:: text

    src/wilco/examples/
    └── <name>/
        ├── __init__.py      # Required: Package marker
        ├── index.tsx        # Required: Component entry point
        ├── schema.json      # Optional: Props schema + metadata
        └── *.tsx            # Optional: Additional component files

Component naming
----------------

Component names are derived from their filesystem path relative to the
components root. **Directory names must be valid Python identifiers**
(letters, numbers, underscores; cannot start with a number).

.. code-block:: text

    components/ui/button/         → "ui.button"
    components/forms/text_input/  → "forms.text_input"
    components/example/counter/   → "example.counter"

The TSX component inside typically uses PascalCase (e.g., ``TextInput.tsx``
inside ``text_input/``). Use a library like ``pyheck`` for case transformations
if needed when generating display names from package paths.

Required files
--------------

__init__.py
^^^^^^^^^^^

A marker file that identifies the directory as a Python package and a valid
component. For now, this file should be empty:

.. code-block:: python

    # Empty file - marks this directory as a component package

**Future extensibility**: This file may later support optional exports for
server-side capabilities such as props validation, data fetching, or props
transformation.

index.tsx
^^^^^^^^^

The entry point for the component. Must export a default React component.

**Option 1: Direct implementation**

.. code-block:: tsx

    // index.tsx - component defined directly
    interface ButtonProps {
      label: string;
      variant?: 'primary' | 'secondary';
      onClick?: () => void;
    }

    export default function Button({ label, variant = 'primary', onClick }: ButtonProps) {
      return (
        <button className={`btn btn-${variant}`} onClick={onClick}>
          {label}
        </button>
      );
    }

**Option 2: Barrel file (recommended for larger components)**

.. code-block:: tsx

    // index.tsx - re-exports from implementation file
    export { default } from './Button';

    // Button.tsx - actual implementation
    export default function Button(props: ButtonProps) {
      // ...
    }

The barrel approach allows better code organization with subcomponents:

.. code-block:: text

    button/
    ├── __init__.py
    ├── index.tsx           # export { default } from './Button'
    ├── Button.tsx          # Main component
    ├── ButtonIcon.tsx      # Subcomponent (internal)
    └── styles.ts           # Shared styles

All files are bundled together as an atomic package.

Optional files
--------------

schema.json
^^^^^^^^^^^

An extended JSON Schema file that defines component props and metadata.
When absent, the component accepts any props and has no UI metadata.

.. code-block:: json

    {
      "title": "Counter",
      "description": "A simple counter component with increment/decrement controls",
      "version": "1.0.0",
      "type": "object",
      "properties": {
        "initialValue": {
          "type": "number",
          "default": 0,
          "description": "Starting value for the counter"
        },
        "step": {
          "type": "number",
          "default": 1,
          "minimum": 1,
          "description": "Amount to increment/decrement by"
        },
        "min": {
          "type": "number",
          "description": "Minimum allowed value"
        },
        "max": {
          "type": "number",
          "description": "Maximum allowed value"
        }
      },
      "required": []
    }

**Root-level metadata fields** (extensions to JSON Schema):

- ``title`` (string): Human-readable component name
- ``description`` (string): Component description for documentation
- ``version`` (string): Semantic version of the component

**Standard JSON Schema fields** for props:

- ``type``: Must be ``"object"``
- ``properties``: Prop definitions using JSON Schema types
- ``required``: Array of required prop names

Component composition
=====================

The ``useComponent`` hook
-------------------------

Components can dynamically load and render other components using the
``useComponent`` hook:

.. code-block:: tsx

    import { useComponent } from '@wilcojs/react';

    export default function Dashboard() {
      const Counter = useComponent('counter');
      const Button = useComponent('button');

      return (
        <div>
          <Counter initialValue={10} />
          <Button label="Reset" onClick={() => {}} />
        </div>
      );
    }

Implementation with React Query
-------------------------------

``useComponent`` is built on top of ``@tanstack/react-query``'s
``useSuspenseQuery``, providing:

- **Automatic caching**: Components are cached after first load
- **Deduplication**: Multiple calls for the same component share one request
- **Background refetching**: Stale components can be refreshed automatically
- **Suspense integration**: Works seamlessly with React Suspense boundaries

.. code-block:: tsx

    // Simplified implementation
    import { useSuspenseQuery } from '@tanstack/react-query';

    export function useComponent(name: string): React.ComponentType<any> {
      const { data: code } = useSuspenseQuery({
        queryKey: ['component', name],
        queryFn: () => fetchBundleCode(name),
        staleTime: Infinity,  // Components don't go stale
      });

      return useMemo(() => compileComponent(code, name), [code, name]);
    }

The hook requires a ``QueryClientProvider`` and ``Suspense`` boundary in the
component tree:

.. code-block:: tsx

    import { QueryClientProvider } from '@tanstack/react-query';
    import { Suspense } from 'react';

    function App() {
      return (
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<Loading />}>
            <Dashboard />
          </Suspense>
        </QueryClientProvider>
      );
    }

Error handling
--------------

When a component fails to load (not found, bundle error, etc.), the hook
throws an error. This should be caught by a React Error Boundary:

.. code-block:: tsx

    import { ErrorBoundary } from 'react-error-boundary';

    function App() {
      return (
        <ErrorBoundary fallback={<ErrorMessage />}>
          <Suspense fallback={<Loading />}>
            <Dashboard />
          </Suspense>
        </ErrorBoundary>
      );
    }

Dependency resolution
---------------------

Dependencies between components are resolved **lazily**:

1. Component A renders and calls ``useComponent('ui.button')``
2. Hook checks if ``ui.button`` is cached
3. If not cached, initiates fetch (throws promise for Suspense)
4. Once loaded, component renders with the resolved dependency

**No explicit dependency declaration is required.** The server does not need
to know about component dependencies ahead of time.

Discovery and registry
======================

Component discovery
-------------------

The backend discovers components by scanning the components directory:

1. Find all directories containing ``__init__.py``
2. Check for ``index.tsx`` (or ``index.ts``) in each
3. Optionally load ``schema.json`` if present
4. Register component with name derived from path

.. code-block:: python

    # Pseudocode for discovery
    for package_dir in find_python_packages(components_root):
        if has_file(package_dir, 'index.tsx'):
            name = path_to_name(package_dir)
            schema = load_optional(package_dir / 'schema.json')
            registry.register(name, package_dir, schema)

Registry refresh
----------------

The registry can be refreshed at runtime to pick up new or modified
components without server restart (useful for development).

API endpoints
=============

List components
---------------

.. code-block:: text

    GET /api/bundles

Returns list of available component names:

.. code-block:: json

    [
      {"name": "example.counter"},
      {"name": "example.carousel"},
      {"name": "ui.button"}
    ]

Get component bundle
--------------------

.. code-block:: text

    GET /api/bundles/{name}.js

Returns bundled JavaScript code for the component. The bundle:

- Is in ESM format
- Includes inline source maps
- Has external dependencies (react, react-dom) excluded
- Is generated on-demand via esbuild

Response headers include ``Cache-Control: no-cache`` for development.

Get component metadata
----------------------

.. code-block:: text

    GET /api/bundles/{name}/metadata

Returns component metadata from ``schema.json``:

.. code-block:: json

    {
      "title": "Counter",
      "description": "A simple counter component",
      "version": "1.0.0",
      "props": {
        "type": "object",
        "properties": {
          "initialValue": {"type": "number", "default": 0}
        }
      }
    }

If no ``schema.json`` exists, returns minimal metadata:

.. code-block:: json

    {
      "title": "counter",
      "description": "",
      "props": {}
    }

Bundling
========

esbuild integration
-------------------

Components are bundled using esbuild with the following configuration:

- **Format**: ESM (ES Modules)
- **Target**: ES2020
- **JSX**: Automatic (React 17+ JSX transform)
- **External**: react, react-dom, react/jsx-runtime
- **Source maps**: Inline with original sources

Source map handling
-------------------

Source maps are rewritten to use a custom URL scheme for debugging:

.. code-block:: text

    component://example.counter/Button.tsx

This allows the frontend to:

1. Identify component sources in stack traces
2. Map generated code back to original TypeScript
3. Display meaningful error locations

Module resolution
-----------------

The frontend provides a module registry that bundled code uses:

.. code-block:: tsx

    window.__MODULES__ = {
      'react': React,
      'react/jsx-runtime': jsxRuntime,
      '@wilcojs/react': wilco,
    };

ESM imports in bundled code are transformed to use this registry:

.. code-block:: javascript

    // Original
    import { useState } from 'react';

    // Transformed
    const { useState } = window.__MODULES__['react'];

Type safety
===========

Current: runtime validation
---------------------------

Props are validated at runtime using JSON Schema:

1. Frontend fetches ``schema.json`` via metadata endpoint
2. PropsEditor UI enforces schema constraints
3. Invalid props show validation errors

Future: TypeScript generation
-----------------------------

*Planned but not yet implemented.*

TypeScript type definitions will be generated from JSON Schema:

.. code-block:: tsx

    // Generated from schema.json
    export interface CounterProps {
      initialValue?: number;
      step?: number;
      min?: number;
      max?: number;
    }

This will enable:

- IDE autocomplete for component props
- Compile-time type checking
- Better developer experience

Examples
========

Minimal component
-----------------

The simplest possible component:

.. code-block:: text

    components/ui/hello/
    ├── __init__.py
    └── index.tsx

.. code-block:: tsx

    // index.tsx
    export default function Hello() {
      return <div>Hello, World!</div>;
    }

Component with props
--------------------

A component with typed props and schema:

.. code-block:: text

    components/ui/greeting/
    ├── __init__.py
    ├── index.tsx
    └── schema.json

.. code-block:: tsx

    // index.tsx
    interface GreetingProps {
      name: string;
      formal?: boolean;
    }

    export default function Greeting({ name, formal = false }: GreetingProps) {
      const greeting = formal ? `Good day, ${name}.` : `Hey ${name}!`;
      return <p>{greeting}</p>;
    }

.. code-block:: json

    {
      "title": "Greeting",
      "description": "Displays a personalized greeting",
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "Name of the person to greet"
        },
        "formal": {
          "type": "boolean",
          "default": false,
          "description": "Use formal greeting style"
        }
      },
      "required": ["name"]
    }

Composable component
--------------------

A component that uses other components:

.. code-block:: text

    components/dashboard/stats/
    ├── __init__.py
    └── index.tsx

.. code-block:: tsx

    // index.tsx
    import { useComponent } from '@wilcojs/react';

    interface StatsProps {
      title: string;
      metrics: Array<{ label: string; value: number }>;
    }

    export default function Stats({ title, metrics }: StatsProps) {
      const Card = useComponent('card');
      const Counter = useComponent('counter');

      return (
        <Card title={title}>
          {metrics.map((metric) => (
            <div key={metric.label}>
              <span>{metric.label}</span>
              <Counter initialValue={metric.value} />
            </div>
          ))}
        </Card>
      );
    }

Multi-file component
--------------------

A larger component with internal organization:

.. code-block:: text

    components/forms/date_picker/
    ├── __init__.py
    ├── index.tsx
    ├── DatePicker.tsx
    ├── Calendar.tsx
    ├── DayCell.tsx
    ├── utils.ts
    └── schema.json

.. code-block:: tsx

    // index.tsx
    export { default } from './DatePicker';

    // DatePicker.tsx
    import Calendar from './Calendar';
    import { formatDate } from './utils';

    export default function DatePicker(props: DatePickerProps) {
      // Uses internal Calendar component
      return <Calendar {...props} />;
    }

Migration from current structure
================================

The current component structure uses co-located ``.py`` and ``.tsx`` files:

.. code-block:: text

    # Current
    components/example/
    ├── __init__.py
    ├── counter.py      # METADATA dict
    └── counter.tsx     # Component

    # New
    components/example/counter/
    ├── __init__.py
    ├── index.tsx       # Component
    └── schema.json     # Props schema

Migration steps:

1. Create subdirectory for each component
2. Move ``.tsx`` to ``index.tsx`` in subdirectory
3. Convert ``METADATA`` dict to ``schema.json``
4. Add ``__init__.py`` to subdirectory
5. Update registry to use new discovery logic

Appendix
========

JSON Schema quick reference
---------------------------

Common property types:

.. code-block:: json

    {
      "stringProp": {"type": "string"},
      "numberProp": {"type": "number", "minimum": 0, "maximum": 100},
      "booleanProp": {"type": "boolean", "default": false},
      "enumProp": {"type": "string", "enum": ["a", "b", "c"]},
      "arrayProp": {"type": "array", "items": {"type": "string"}},
      "objectProp": {
        "type": "object",
        "properties": {"nested": {"type": "string"}}
      }
    }

Error codes
-----------

+------------------------+------------------------------------------------+
| Error                  | Cause                                          |
+========================+================================================+
| ComponentNotFound      | No component with given name in registry       |
+------------------------+------------------------------------------------+
| BundleError            | esbuild failed to bundle the component         |
+------------------------+------------------------------------------------+
| SchemaValidationError  | Props don't match schema (runtime)             |
+------------------------+------------------------------------------------+
| RenderError            | Component threw during React render            |
+------------------------+------------------------------------------------+
