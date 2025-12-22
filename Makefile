.PHONY: start test test-backend test-frontend install clean wheel

# Start development servers (default target)
start:
	overmind start

# Build Python wheel
wheel:
	uv build

# Run all tests
test: test-backend test-frontend

# Run backend tests (Python/pytest)
test-backend:
	uv run pytest

# Run frontend tests (TypeScript typecheck + Vitest)
test-frontend:
	cd src/wilcojs/react && pnpm typecheck && pnpm test:run

# Install all dependencies
install:
	uv sync
	cd src/wilcojs/react && pnpm install

# Clean build artifacts
clean:
	rm -rf .pytest_cache
	rm -rf dist
	rm -rf src/wilcojs/react/dist
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
