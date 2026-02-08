.PHONY: install setup start backend frontend test clean help

# Default target
.DEFAULT_GOAL := start

# Port configuration
HTTP_PORT ?= 8000
FRONTEND_PORT ?= $(shell echo $$(($(HTTP_PORT) + 1)))

########################################################################################################################
# Development
########################################################################################################################

start:  ## Start development server (backend + frontend)
	@if command -v overmind >/dev/null 2>&1; then \
		HTTP_PORT=$(HTTP_PORT) FRONTEND_PORT=$(FRONTEND_PORT) overmind start; \
	else \
		echo "overmind not found, starting backend only (install overmind to run both)"; \
		$(MAKE) backend; \
	fi

backend:  ## Start backend development server only
	uv run uvicorn app.main:app --reload --port $(HTTP_PORT)

frontend:  ## Start frontend development server only
	cd frontend && VITE_PORT=$(FRONTEND_PORT) VITE_API_PORT=$(HTTP_PORT) pnpm dev

test:  ## Run test suite
	uv run pytest
	cd frontend && pnpm test

########################################################################################################################
# Setup
########################################################################################################################

install:  ## Install Python and JavaScript dependencies
	uv sync
	cd frontend && pnpm install

setup: install  ## Full setup: install deps, create tables, load fixtures
	@echo "Creating database tables..."
	uv run python -c "from app.database import create_tables; create_tables()"
	@echo "Copying product images..."
	@mkdir -p resources/media/products
	@cp -r ../common/fixtures/images/products/* resources/media/products/
	@echo "Loading sample products..."
	uv run python -c "from app.fixtures import load_fixtures; load_fixtures()"
	@echo "Setup complete!"

########################################################################################################################
# Cleanup
########################################################################################################################

clean:  ## Clean database and cache
	rm -rf .venv
	rm -f db.sqlite3
	rm -rf resources/media
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

########################################################################################################################
# Help
########################################################################################################################

help:  ## Show available commands
	@echo "FastAPI Example"
	@echo "==============="
	@echo
	@echo "Ports: HTTP_PORT (default: 8000), FRONTEND_PORT (default: HTTP_PORT+1)"
	@echo "  make start HTTP_PORT=9000"
	@echo
	@echo "\033[1mSetup\033[0m"
	@grep -E '^(install|setup):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mDevelopment\033[0m"
	@grep -E '^(start|backend|frontend|test):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mCleanup\033[0m"
	@grep -E '^(clean):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
