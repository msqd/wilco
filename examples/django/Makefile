.PHONY: install setup migrate fixtures users start clean help

# Default target
.DEFAULT_GOAL := start

########################################################################################################################
# Development
########################################################################################################################

start:  ## Start development server
	uv run python manage.py runserver

########################################################################################################################
# Setup
########################################################################################################################

install:  ## Install Python dependencies
	uv sync

setup: install migrate fixtures users  ## Full setup: install, migrate, load fixtures, create users

migrate:  ## Run database migrations
	uv run python manage.py migrate

fixtures:  ## Load sample product data
	uv run python manage.py loaddata resources/fixtures/sample_products.json

users:  ## Create both admin and demo users
	@echo "Creating demo users..."
	@uv run python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin'); User.objects.filter(username='demo').exists() or User.objects.create_user('demo', 'demo@example.com', 'demo')"

########################################################################################################################
# Cleanup
########################################################################################################################

clean:  ## Clean database and cache
	rm -rf .venv
	rm -f db.sqlite3
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

########################################################################################################################
# Help
########################################################################################################################

help:  ## Show available commands
	@echo "Available commands:"
	@echo
	@echo "\033[1mDevelopment\033[0m"
	@grep -E '^(start):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mSetup\033[0m"
	@grep -E '^(install|setup|migrate|fixtures|users):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "\033[1mCleanup\033[0m"
	@grep -E '^(clean):.*?##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?##"}; {printf "    make \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
