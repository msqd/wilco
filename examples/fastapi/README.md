# FastAPI Ecommerce Example

An example ecommerce application built with FastAPI, SQLAlchemy, and a React/TypeScript frontend, showcasing wilco integration.

## Features

- FastAPI backend with SQLAlchemy ORM
- SQLAdmin for admin panel
- React/TypeScript SPA frontend with Vite
- Tailwind CSS v4 for styling
- wilco component integration via API

## Quick Start

```bash
# Setup everything (install dependencies, create database, load fixtures)
make setup

# Start development servers (backend + frontend)
make start
```

Open http://localhost:5173 to view the application.

## Available Commands

Run `make help` to see all available commands:

- `make start` - Start both backend and frontend servers
- `make backend` - Start backend server only
- `make frontend` - Start frontend server only
- `make install` - Install all dependencies
- `make setup` - Full setup (install, migrate, fixtures)
- `make migrate` - Create database tables
- `make fixtures` - Load sample product data
- `make clean` - Clean database and caches

## Project Structure

```
fastapi/
├── app/                    # FastAPI application
│   ├── main.py            # Application entry point
│   ├── models.py          # SQLAlchemy models
│   ├── database.py        # Database configuration
│   ├── admin.py           # SQLAdmin configuration
│   └── fixtures.py        # Fixture loading
├── frontend/              # React/TypeScript SPA
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   └── package.json
├── resources/
│   ├── static/            # Static assets
│   └── fixtures/          # Sample data
├── Makefile               # Development commands
├── Procfile               # Overmind process file
└── pyproject.toml         # Python dependencies
```

## Development

The frontend proxies API requests to the backend, so both need to be running. The easiest way is with overmind:

```bash
make start
```

Or run them separately:

```bash
# Terminal 1: Backend
make backend

# Terminal 2: Frontend
make frontend
```

## Admin Panel

Access the admin panel at http://localhost:5173/admin (via proxy) or directly at http://localhost:8000/admin.
