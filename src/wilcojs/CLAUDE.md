# wilcojs frontend

Instructions for working with the frontend packages (`src/wilcojs/`).

## Structure

```
wilcojs/
└── react/                      # React frontend application
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx            # Application entry point
        ├── App.tsx             # Main application component
        ├── api/
        │   └── bundles.ts      # API hooks (useBundles, useBundleMetadata, etc.)
        ├── components/         # UI components (barrel pattern)
        │   ├── index.ts        # Exports only
        │   ├── PropsEditor.tsx
        │   └── StackTrace.tsx
        └── loader/             # Component loading system
            ├── ServerComponent.tsx
            ├── useComponent.ts
            ├── wilco.ts
            └── standalone.ts
```

## Commands

```bash
cd src/wilcojs/react

pnpm install      # Install dependencies
pnpm dev          # Start dev server (port 5173, proxies /api to backend)
pnpm typecheck    # TypeScript type checking
pnpm test:run     # Run tests once
pnpm build        # Build for production
pnpm build:loader # Build standalone loader
```

## Code organization

### Barrel pattern

Use `index.ts` files only for re-exports. Components go in their own files:

```typescript
// components/index.ts - ONLY exports
export { PropsEditor } from "./PropsEditor"
export { StackTrace } from "./StackTrace"

// components/MyComponent.tsx - actual implementation
export function MyComponent() { ... }
```

### Component dependencies

When a component needs to use another wilco component, use `useComponent` instead of direct imports:

```typescript
// CORRECT: Use useComponent for wilco components
import { useComponent } from "../loader/useComponent"

function MyComponent() {
  const ImageComponent = useComponent("image")
  return <ImageComponent src="..." />
}

// WRONG: Don't directly import wilco components
import { ImageComponent } from "../../../wilco/examples/image"
```

This ensures proper isolation and dynamic loading.

## State management

Uses `@tanstack/react-query` for server state:

- `useBundles()` - Fetch list of available bundles
- `useBundleMetadata(name)` - Fetch metadata for a specific bundle
- `useBundleCode(name)` - Fetch bundled JavaScript code

Hooks are defined in `src/api/bundles.ts`.

## Testing

Tests use Vitest with React Testing Library:

```bash
pnpm test:run           # Run all tests once
pnpm test               # Run in watch mode
pnpm typecheck          # Type checking (also part of CI)
```

Test files are co-located: `Component.tsx` → `Component.test.tsx`

## Hot reloading

Vite provides HMR (Hot Module Replacement) for instant updates during development.
