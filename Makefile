.PHONY: start test test-backend test-frontend install install-dev clean wheel format format-python format-frontend build-loader publish publish-test docs docs-watch help

# Default target
.DEFAULT_GOAL := start

# helpers
define execute
@echo "⚙️ \033[36m$@\033[0m: \033[2m$(1)\033[0m"
@$(1)
endef

########################################################################################################################
# Development
########################################################################################################################

start:  ## Start development servers (backend + frontend)
	$(call execute,overmind start)

install:  ## Install dependencies (Python + JavaScript)
	$(call execute,uv sync)
	$(call execute,cd src/wilcojs/react && pnpm install)

install-dev:  ## Install dependencies with dev tools (Python + JavaScript)
	$(call execute,uv sync --extra dev --group dev)
	$(call execute,cd src/wilcojs/react && pnpm install)

########################################################################################################################
# Build
########################################################################################################################

build-loader:  ## Build the standalone loader (TypeScript -> JavaScript)
	$(call execute,cd src/wilcojs/react && pnpm build:loader)

wheel: build-loader  ## Build Python wheel (includes pre-built JS assets)
	$(call execute,uv build)

########################################################################################################################
# Publishing
########################################################################################################################

publish: wheel  ## Publish to PyPI
	$(call execute,uv run twine upload dist/*)

publish-test: wheel  ## Publish to TestPyPI (for testing)
	$(call execute,uv run twine upload --repository testpypi dist/*)

########################################################################################################################
# Testing
########################################################################################################################

test: test-backend test-frontend  ## Run all tests

test-backend: install-dev  ## Run backend tests (Python/pytest)
	$(call execute,uv run pytest)

test-frontend:  ## Run frontend tests (TypeScript typecheck + Vitest)
	$(call execute,cd src/wilcojs/react && pnpm typecheck && pnpm test:run)

########################################################################################################################
# Documentation
########################################################################################################################

docs: install-dev  ## Build documentation with Sphinx
	$(call execute,uv run sphinx-build -b html docs docs/_build/html)

docs-watch: install-dev  ## Build documentation and watch for changes
	$(call execute,uv run sphinx-autobuild docs docs/_build/html --watch src)

########################################################################################################################
# Code Quality
########################################################################################################################

format: format-python format-frontend  ## Format all code

format-python: install-dev  ## Format Python files with ruff
	$(call execute,uv run ruff format src tests)

format-frontend:  ## Format frontend files with biome
	$(call execute,cd src/wilcojs/react && pnpm exec biome format --write .)

########################################################################################################################
# Cleanup
########################################################################################################################

clean:  ## Clean build artifacts
	rm -rf .pytest_cache
	rm -rf dist
	rm -rf docs/_build
	rm -rf src/wilcojs/react/dist
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

########################################################################################################################
# Help
########################################################################################################################

help:  ## Show available commands
	@echo "Available commands:"
	@echo
	@echo "\033[1mDevelopment\033[0m"
	@grep -E '^(start|install|install-dev):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mBuild\033[0m"
	@grep -E '^(build-loader|wheel):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mPublishing\033[0m"
	@grep -E '^(publish|publish-test):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mTesting\033[0m"
	@grep -E '^(test|test-backend|test-frontend):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mDocumentation\033[0m"
	@grep -E '^(docs|docs-watch):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mCode Quality\033[0m"
	@grep -E '^(format|format-python|format-frontend):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mCleanup\033[0m"
	@grep -E '^(clean):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
