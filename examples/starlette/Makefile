.PHONY: install setup start-dev start-prod test build clean help

# Default target
.DEFAULT_GOAL := help

# Environment
export VIRTUAL_ENV := $(CURDIR)/.venv

# Port configuration
HTTP_PORT ?= 8400

########################################################################################################################
# Development
########################################################################################################################

start-dev:  ## Start development server
	uv run uvicorn app.main:app --reload --port $(HTTP_PORT)

start-prod:  ## Start production server (pre-built components)
	uv run uvicorn app.main:app --port $(HTTP_PORT)

test:  ## Run test suite
	uv run pytest

########################################################################################################################
# Setup
########################################################################################################################

install:  ## Install Python dependencies
	uv sync

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
# Build
########################################################################################################################

build:  ## Build for production (pre-compile components)
	uv run python -m wilco build --output dist/wilco/ --components-dir ../common/components/store

########################################################################################################################
# Cleanup
########################################################################################################################

clean:  ## Clean database and cache
	rm -rf .venv
	rm -f db.sqlite3
	rm -rf dist
	rm -rf resources/media
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

########################################################################################################################
# Help
########################################################################################################################

help:  ## Show available commands
	@echo "Starlette Example"
	@echo "================="
	@echo
	@echo "Port: HTTP_PORT (default: 8400)"
	@echo "  make start-dev HTTP_PORT=9000"
	@echo
	@echo "\033[1mStart\033[0m"
	@grep -E '^(start-dev|start-prod):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mSetup\033[0m"
	@grep -E '^(install|setup):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mDevelopment\033[0m"
	@grep -E '^(test):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mBuild\033[0m"
	@grep -E '^(build):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mCleanup\033[0m"
	@grep -E '^(clean):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
