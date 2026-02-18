.PHONY: install setup start test clean help

# Default target
.DEFAULT_GOAL := start

# Environment
export VIRTUAL_ENV := $(CURDIR)/.venv

# Port configuration
HTTP_PORT ?= 8200

########################################################################################################################
# Development
########################################################################################################################

start:  ## Start development server
	uv run flask --app app.main:create_app run --port $(HTTP_PORT) --debug

test:  ## Run test suite
	uv run pytest

########################################################################################################################
# Setup
########################################################################################################################

install:  ## Install Python dependencies
	uv sync

setup: install  ## Full setup: install deps, create database, load fixtures
	@echo "Creating database..."
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
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

########################################################################################################################
# Help
########################################################################################################################

help:  ## Show available commands
	@echo "Flask Example"
	@echo "============="
	@echo
	@echo "Port: HTTP_PORT (default: 8200)"
	@echo "  make start HTTP_PORT=9000"
	@echo
	@echo "\033[1mSetup\033[0m"
	@grep -E '^(install|setup):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mDevelopment\033[0m"
	@grep -E '^(start|test):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mCleanup\033[0m"
	@grep -E '^(clean):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
