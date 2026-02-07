.PHONY: install setup migrate fixtures start clean help dev

# Default target
.DEFAULT_GOAL := start

########################################################################################################################
# Development
########################################################################################################################

start:  ## Start development server (backend + frontend)
	@if command -v overmind >/dev/null 2>&1; then \
		overmind start; \
	else \
		echo "overmind not found, starting backend only (install overmind to run both)"; \
		$(MAKE) backend; \
	fi

backend:  ## Start backend development server only
	uv run uvicorn app.main:app --reload --port 8000

frontend:  ## Start frontend development server only
	cd frontend && pnpm dev

########################################################################################################################
# Setup
########################################################################################################################

install:  ## Install Python and JavaScript dependencies
	uv sync
	cd frontend && pnpm install

setup: install migrate fixtures  ## Full setup: install, migrate, load fixtures

migrate:  ## Run database migrations (create tables)
	uv run python -c "from app.database import create_tables; create_tables()"

fixtures:  ## Load sample product data
	uv run python -c "from app.fixtures import load_fixtures; load_fixtures()"

########################################################################################################################
# Cleanup
########################################################################################################################

clean:  ## Clean database and cache
	rm -rf .venv
	rm -f db.sqlite3
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

########################################################################################################################
# Help
########################################################################################################################

help:  ## Show available commands
	@echo "Available commands:"
	@echo
	@echo "\033[1mDevelopment\033[0m"
	@grep -E '^(start|backend|frontend):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mSetup\033[0m"
	@grep -E '^(install|setup|migrate|fixtures):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mCleanup\033[0m"
	@grep -E '^(clean):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
