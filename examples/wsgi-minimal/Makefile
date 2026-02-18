# Minimal WSGI Example Makefile
# Demonstrates wilco integration with raw WSGI (no framework)

.PHONY: help install setup test start clean

# Environment
export VIRTUAL_ENV := $(CURDIR)/.venv

HTTP_PORT ?= 8600

help:
	@echo "Minimal WSGI Example"
	@echo ""
	@echo "Commands:"
	@echo "  make install  - Install Python dependencies"
	@echo "  make setup    - Set up database and fixtures"
	@echo "  make start    - Start the development server"
	@echo "  make test     - Run tests"
	@echo "  make clean    - Clean up generated files"

install:
	uv sync

setup: install
	uv run python -m app.database setup

test:
	uv run pytest tests/ -v

start: setup
	uv run gunicorn app.wsgi:app --bind 0.0.0.0:$(HTTP_PORT) --reload

clean:
	rm -rf .venv __pycache__ .pytest_cache
	rm -f resources/media/*.jpg resources/media/*.png
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
