# Wilco E2E Tests

End-to-end tests for all wilco example applications using Playwright.

## Quick Start

```bash
# Install dependencies
pnpm install
pnpm install-browsers

# Run all tests
pnpm test

# Run tests for a specific framework
pnpm test:django-unfold
pnpm test:django-vanilla
pnpm test:flask
pnpm test:fastapi
pnpm test:starlette
pnpm test:asgi-minimal
pnpm test:wsgi-minimal
```

## Test Structure

```
e2e/
├── src/
│   ├── adapters/           # Framework-specific configurations
│   │   ├── FrameworkAdapter.ts
│   │   ├── DjangoUnfoldAdapter.ts
│   │   ├── DjangoVanillaAdapter.ts
│   │   ├── FlaskAdapter.ts
│   │   ├── FastAPIAdapter.ts
│   │   ├── StarletteAdapter.ts
│   │   ├── AsgiMinimalAdapter.ts
│   │   └── WsgiMinimalAdapter.ts
│   ├── pages/              # Page Object Models
│   │   ├── BasePage.ts
│   │   ├── ProductListPage.ts
│   │   ├── ProductDetailPage.ts
│   │   └── AdminPage.ts
│   ├── server/             # Server lifecycle management
│   │   ├── ServerManager.ts
│   │   ├── HealthChecker.ts
│   │   └── types.ts
│   └── fixtures/           # Playwright setup/teardown
│       ├── global.setup.ts
│       └── global.teardown.ts
├── tests/
│   ├── django-unfold/      # Django Unfold tests
│   ├── django-vanilla/     # Django Vanilla tests
│   ├── flask/              # Flask tests
│   ├── fastapi/            # FastAPI tests
│   ├── starlette/          # Starlette tests
│   ├── asgi-minimal/       # ASGI Minimal tests
│   └── wsgi-minimal/       # WSGI Minimal tests
└── playwright.config.ts
```

## Environment Variables

### `WILCO_E2E_FRAMEWORK`

Controls which framework(s) to test. Used internally by the npm scripts.

```bash
# Run only Django Unfold tests
WILCO_E2E_FRAMEWORK=django-unfold pnpm test

# Run multiple frameworks (comma-separated)
WILCO_E2E_FRAMEWORK=django-unfold,starlette pnpm test
```

### `HEADED`

Show the browser window during test execution (useful for debugging).

```bash
# Run tests with visible browser
HEADED=1 pnpm test

# Or use the convenience script
pnpm test:headed
```

### `PWDEBUG`

Enable Playwright's debug mode with step-by-step execution.

```bash
# Run with Playwright Inspector
PWDEBUG=1 pnpm test

# Or use the convenience script
pnpm test:debug
```

### `CI`

Automatically set in CI environments. Enables:
- GitHub reporter format
- Retries on failure (2 retries)
- Stricter `test.only` detection

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm test` | Run all E2E tests for all frameworks |
| `pnpm test:django-unfold` | Run Django Unfold tests only |
| `pnpm test:django-vanilla` | Run Django Vanilla tests only |
| `pnpm test:flask` | Run Flask tests only |
| `pnpm test:fastapi` | Run FastAPI tests only |
| `pnpm test:starlette` | Run Starlette tests only |
| `pnpm test:asgi-minimal` | Run ASGI Minimal tests only |
| `pnpm test:wsgi-minimal` | Run WSGI Minimal tests only |
| `pnpm test:headed` | Run tests with visible browser |
| `pnpm test:debug` | Run with Playwright Inspector |
| `pnpm test:ui` | Open Playwright UI mode |
| `pnpm install-browsers` | Install Chromium browser |

## Server Management

Tests automatically manage server lifecycle:

1. **Setup**: Starts required servers before tests run
2. **Health Check**: Waits for servers to be ready (HTTP polling)
3. **Teardown**: Gracefully stops all servers after tests complete

### Port Configuration

Ports are allocated in 100 increments to leave room for additional services.

| Framework | Server | Port |
|-----------|--------|------|
| Django Unfold | Django dev server | 8000 |
| Django Vanilla | Django dev server | 8100 |
| Flask | Flask dev server | 8200 |
| FastAPI | Vite (frontend) | 8300 |
| FastAPI | Uvicorn (backend) | 8301 |
| Starlette | Uvicorn | 8400 |
| ASGI Minimal | Uvicorn | 8500 |
| WSGI Minimal | Gunicorn | 8600 |

## Test Coverage

### Full Framework Examples

Each full framework (Django Unfold, Django Vanilla, Flask, FastAPI, Starlette) includes tests for:

- **Product List**: Displays 6 products with titles, prices, and images
- **Product Detail**: Shows full product information, handles 404s
- **Admin Panel**: Accessible and shows product management interface

### Minimal Protocol Examples

Minimal examples (ASGI Minimal, WSGI Minimal) include tests for:

- **Product List**: Displays 6 products with titles, prices, and images
- **Product Detail**: Shows full product information, handles 404s

Note: Minimal examples do not have admin tests since they have no admin interface.

## Debugging Tips

### View test failures

Screenshots are automatically captured on failure in `test-results/`.

### Run a single test

```bash
# Run specific test file
pnpm test tests/django-unfold/product-list.spec.ts

# Run test matching pattern
pnpm test -g "displays 6 products"
```

### Inspect page state

Use Playwright's debug mode to pause and inspect:

```bash
PWDEBUG=1 pnpm test:django-unfold
```

### Check server logs

Server output is prefixed with the server name during test runs:

```
[django-unfold] ... server logs ...
[fastapi-backend] ... backend logs ...
[fastapi-frontend] ... frontend logs ...
```

### Increase timeouts

For slow environments, timeouts can be adjusted in `playwright.config.ts`:

```typescript
use: {
  actionTimeout: 10000,      // Per-action timeout
  navigationTimeout: 30000,  // Navigation timeout
},
timeout: 60000,              // Test timeout
```

## Writing New Tests

1. Add test file to appropriate `tests/<framework>/` directory
2. Use page objects from `src/pages/` for interactions
3. Access framework-specific selectors via the adapter

Example:

```typescript
import { test, expect } from "@playwright/test";
import { ProductListPage } from "../../src/pages/ProductListPage.js";
import { getAdapter } from "../../src/adapters/index.js";

test.describe("My Feature", () => {
  test("should work", async ({ page }) => {
    const adapter = getAdapter("django-unfold");
    const productList = new ProductListPage(page, adapter);

    await productList.navigate();
    await productList.expectProductCount(6);
  });
});
```

## Troubleshooting

### Tests timeout waiting for server

- Check if the port is already in use
- Increase `healthCheckTimeout` in the adapter
- Verify the server command works manually

### Selectors not finding elements

- Use `HEADED=1` to see the actual page
- Check if the framework uses different HTML structure
- Update selectors in the appropriate adapter

### FastAPI frontend starts on wrong port

The Vite dev server reads `VITE_PORT` from environment. Ensure `vite.config.ts` includes:

```typescript
server: {
  port: parseInt(process.env.VITE_PORT || '5173', 10),
}
```
