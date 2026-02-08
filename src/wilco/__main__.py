"""Entry point for running the wilco development server."""

from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .bridges.fastapi import create_router
from .registry import ComponentRegistry


def create_app(components_dir: Path | None = None) -> FastAPI:
    """Create a standalone FastAPI app for development.

    Args:
        components_dir: Path to components directory. Defaults to
            ./components or packaged examples.
    """
    app = FastAPI(title="wilco", description="Serve React components from Python")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Determine components directory
    if components_dir is None:
        # Check for local components/ directory first
        local_components = Path.cwd() / "components"
        if local_components.exists():
            components_dir = local_components
        else:
            # Fall back to packaged examples
            components_dir = Path(__file__).parent / "examples"

    registry = ComponentRegistry(components_dir)
    router = create_router(registry)
    app.include_router(router, prefix="/api")

    return app


# Create app instance for uvicorn reload mode
app = create_app()


def main() -> None:
    """Run the development server."""
    uvicorn.run("wilco.__main__:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
