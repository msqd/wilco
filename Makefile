.PHONY: start test test-backend test-frontend install clean wheel format format-python format-frontend

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

# Format all code
format: format-python format-frontend

# Format Python files with ruff (4 spaces, 120 chars)
format-python:
	uv run ruff format src tests

# Format frontend files with biome
format-frontend:
	cd src/wilcojs/react && pnpm exec biome format --write .
