.PHONY: start test test-backend test-frontend install clean

# Start development servers (default target)
start:
	overmind start

# Run all tests
test: test-backend test-frontend

# Run backend tests (Python/pytest)
test-backend:
	uv run pytest

# Run frontend tests (TypeScript typecheck)
test-frontend:
	cd src/wilcojs/react && pnpm typecheck

# Install all dependencies
install:
	uv sync
	cd src/wilcojs/react && pnpm install

# Clean build artifacts
clean:
	rm -rf .pytest_cache
	rm -rf src/wilcojs/react/dist
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
