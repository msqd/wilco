.PHONY: install setup start test clean help django fastapi starlette

# Default target
.DEFAULT_GOAL := start

# Port configuration for running all examples simultaneously
DJANGO_PORT ?= 8000
FASTAPI_PORT ?= 8100
STARLETTE_PORT ?= 8200

# Subdirectories
EXAMPLES := django fastapi starlette

########################################################################################################################
# All Examples
########################################################################################################################

start:  ## Start all examples simultaneously (requires overmind)
	@if command -v overmind >/dev/null 2>&1; then \
		DJANGO_PORT=$(DJANGO_PORT) \
		FASTAPI_PORT=$(FASTAPI_PORT) \
		STARLETTE_PORT=$(STARLETTE_PORT) \
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
# Individual Examples
########################################################################################################################

django:  ## Start Django example only
	$(MAKE) -C django start HTTP_PORT=$(DJANGO_PORT)

fastapi:  ## Start FastAPI example only
	$(MAKE) -C fastapi start HTTP_PORT=$(FASTAPI_PORT)

starlette:  ## Start Starlette example only
	$(MAKE) -C starlette start HTTP_PORT=$(STARLETTE_PORT)

########################################################################################################################
# Help
########################################################################################################################

help:  ## Show available commands
	@echo "Examples Runner"
	@echo "==============="
	@echo
	@echo "Run all examples simultaneously with different ports:"
	@echo "  make start                    # Django:8000, FastAPI:8100, Starlette:8200"
	@echo "  make start DJANGO_PORT=9000   # Custom ports"
	@echo
	@echo "\033[1mAll Examples\033[0m"
	@grep -E '^(start|install|setup|test|clean):.*?##' $(MAKEFILE_LIST) | head -5 | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mIndividual Examples\033[0m"
	@grep -E '^(django|fastapi|starlette):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
