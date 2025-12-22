.PHONY: setup migrate fixtures users superuser demouser start clean

# Start development server
start:
	uv run python manage.py runserver

# Full setup: migrate, load fixtures, create users
setup: migrate fixtures users

# Run database migrations
migrate:
	uv run python manage.py migrate

# Load sample product data
fixtures:
	uv run python manage.py loaddata fixtures/sample_products.json

# Create both admin and demo users
users: superuser demouser

# Create admin superuser (admin/admin)
superuser:
	@echo "Creating superuser admin/admin..."
	@uv run python manage.py shell -c "\
from django.contrib.auth import get_user_model; \
User = get_user_model(); \
User.objects.filter(username='admin').exists() or \
User.objects.create_superuser('admin', 'admin@example.com', 'admin')"

# Create demo user (demo/demo)
demouser:
	@echo "Creating demo user demo/demo..."
	@uv run python manage.py shell -c "\
from django.contrib.auth import get_user_model; \
User = get_user_model(); \
User.objects.filter(username='demo').exists() or \
User.objects.create_user('demo', 'demo@example.com', 'demo')"

# Clean database and cache
clean:
	rm -f db.sqlite3
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -path "*/migrations/*.py" -not -name "__init__.py" -delete 2>/dev/null || true
