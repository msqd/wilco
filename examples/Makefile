.PHONY: install setup start test clean help django-unfold django-vanilla flask fastapi starlette asgi-minimal wsgi-minimal test-e2e test-e2e-django-unfold test-e2e-django-vanilla test-e2e-flask test-e2e-fastapi test-e2e-starlette test-e2e-asgi-minimal test-e2e-wsgi-minimal

# Default target
.DEFAULT_GOAL := start

# Port configuration for running all examples simultaneously
# Using 100 increments to leave room for additional services per example
DJANGO_UNFOLD_PORT ?= 8000
DJANGO_VANILLA_PORT ?= 8100
FLASK_PORT ?= 8200
FASTAPI_PORT ?= 8300
STARLETTE_PORT ?= 8400
ASGI_MINIMAL_PORT ?= 8500
WSGI_MINIMAL_PORT ?= 8600

# Subdirectories
EXAMPLES := django-unfold django-vanilla flask fastapi starlette asgi-minimal wsgi-minimal

########################################################################################################################
# All Examples
########################################################################################################################

start:  ## Start all examples simultaneously (requires overmind)
	@if command -v overmind >/dev/null 2>&1; then \
		DJANGO_UNFOLD_PORT=$(DJANGO_UNFOLD_PORT) \
		DJANGO_VANILLA_PORT=$(DJANGO_VANILLA_PORT) \
		FLASK_PORT=$(FLASK_PORT) \
		FASTAPI_PORT=$(FASTAPI_PORT) \
		STARLETTE_PORT=$(STARLETTE_PORT) \
		ASGI_MINIMAL_PORT=$(ASGI_MINIMAL_PORT) \
		WSGI_MINIMAL_PORT=$(WSGI_MINIMAL_PORT) \
		overmind start; \
	else \
		echo "Error: overmind is required to run all examples simultaneously"; \
		echo "Install with: brew install overmind (macOS) or see https://github.com/DarthSim/overmind"; \
		exit 1; \
	fi

install:  ## Install dependencies for all examples
	@for example in $(EXAMPLES); do \
		echo "Installing $$example..."; \
		$(MAKE) -C $$example install; \
	done

setup:  ## Setup all examples (install + database + fixtures)
	@for example in $(EXAMPLES); do \
		echo "Setting up $$example..."; \
		$(MAKE) -C $$example setup; \
	done

test:  ## Run tests for all examples
	@for example in $(EXAMPLES); do \
		echo "Testing $$example..."; \
		$(MAKE) -C $$example test; \
	done

clean:  ## Clean all examples
	@for example in $(EXAMPLES); do \
		echo "Cleaning $$example..."; \
		$(MAKE) -C $$example clean; \
	done

########################################################################################################################
# E2E Tests
########################################################################################################################

test-e2e:  ## Run all E2E tests (Django Unfold, Django Vanilla, Flask, FastAPI, Starlette)
	cd e2e && pnpm test

test-e2e-django-unfold:  ## Run Django Unfold E2E tests only
	cd e2e && pnpm test:django-unfold

test-e2e-django-vanilla:  ## Run Django Vanilla E2E tests only
	cd e2e && pnpm test:django-vanilla

test-e2e-flask:  ## Run Flask E2E tests only
	cd e2e && pnpm test:flask

test-e2e-fastapi:  ## Run FastAPI E2E tests only
	cd e2e && pnpm test:fastapi

test-e2e-starlette:  ## Run Starlette E2E tests only
	cd e2e && pnpm test:starlette

test-e2e-asgi-minimal:  ## Run ASGI Minimal E2E tests only
	cd e2e && pnpm test:asgi-minimal

test-e2e-wsgi-minimal:  ## Run WSGI Minimal E2E tests only
	cd e2e && pnpm test:wsgi-minimal

########################################################################################################################
# Individual Examples
########################################################################################################################

django-unfold:  ## Start Django Unfold example only
	$(MAKE) -C django-unfold start HTTP_PORT=$(DJANGO_UNFOLD_PORT)

django-vanilla:  ## Start Django Vanilla example only
	$(MAKE) -C django-vanilla start HTTP_PORT=$(DJANGO_VANILLA_PORT)

flask:  ## Start Flask example only
	$(MAKE) -C flask start HTTP_PORT=$(FLASK_PORT)

fastapi:  ## Start FastAPI example only
	$(MAKE) -C fastapi start HTTP_PORT=$(FASTAPI_PORT)

starlette:  ## Start Starlette example only
	$(MAKE) -C starlette start HTTP_PORT=$(STARLETTE_PORT)

asgi-minimal:  ## Start ASGI Minimal example only
	$(MAKE) -C asgi-minimal start HTTP_PORT=$(ASGI_MINIMAL_PORT)

wsgi-minimal:  ## Start WSGI Minimal example only
	$(MAKE) -C wsgi-minimal start HTTP_PORT=$(WSGI_MINIMAL_PORT)

########################################################################################################################
# Help
########################################################################################################################

help:  ## Show available commands
	@echo "Examples Runner"
	@echo "==============="
	@echo
	@echo "Run all examples simultaneously with different ports:"
	@echo "  make start                           # Django Unfold:8000, Django Vanilla:8100, Flask:8200, FastAPI:8300, Starlette:8400, ASGI-Minimal:8500, WSGI-Minimal:8600"
	@echo "  make start DJANGO_UNFOLD_PORT=9000   # Custom ports"
	@echo
	@echo "\033[1mAll Examples\033[0m"
	@grep -E '^(start|install|setup|test|clean):.*?##' $(MAKEFILE_LIST) | head -5 | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mIndividual Examples\033[0m"
	@grep -E '^(django-unfold|django-vanilla|flask|fastapi|starlette|asgi-minimal|wsgi-minimal):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mE2E Tests\033[0m"
	@grep -E '^(test-e2e|test-e2e-django-unfold|test-e2e-django-vanilla|test-e2e-flask|test-e2e-fastapi|test-e2e-starlette|test-e2e-asgi-minimal|test-e2e-wsgi-minimal):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
