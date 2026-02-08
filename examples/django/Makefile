.PHONY: install setup start test clean help

# Default target
.DEFAULT_GOAL := start

# Port configuration
HTTP_PORT ?= 8000

########################################################################################################################
# Development
########################################################################################################################

start:  ## Start development server
	uv run python manage.py runserver $(HTTP_PORT)

test:  ## Run test suite
	uv run pytest

########################################################################################################################
# Setup
########################################################################################################################

install:  ## Install Python dependencies
	uv sync

setup: install  ## Full setup: install deps, migrate, load fixtures, create users, collect static
	@echo "Running migrations..."
	uv run python manage.py migrate --no-input
	@echo "Copying product images..."
	@mkdir -p resources/media/products
	@cp -r ../common/fixtures/images/products/* resources/media/products/
	@echo "Loading sample products..."
	uv run python manage.py loaddata resources/fixtures/sample_products.json
	@echo "Creating demo users..."
	@uv run python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); admin, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@example.com', 'is_superuser': True, 'is_staff': True}); admin.set_password('admin'); admin.save(); demo, _ = User.objects.get_or_create(username='demo', defaults={'email': 'demo@example.com'}); demo.set_password('demo'); demo.save(); print('Users ready: admin/admin, demo/demo')"
	@echo "Collecting static files..."
	uv run python manage.py collectstatic --no-input
	@echo "Setup complete!"

########################################################################################################################
# Cleanup
########################################################################################################################

clean:  ## Clean database and cache
	rm -rf .venv
	rm -f db.sqlite3
	rm -rf staticfiles
	rm -rf resources/media
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

########################################################################################################################
# Help
########################################################################################################################

help:  ## Show available commands
	@echo "Django Example"
	@echo "=============="
	@echo
	@echo "Port: HTTP_PORT (default: 8000)"
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
