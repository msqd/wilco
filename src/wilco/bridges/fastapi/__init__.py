"""FastAPI bridge for serving components.

Requires: pip install wilco[fastapi]
"""

import importlib.util

if importlib.util.find_spec("fastapi") is None:
    raise ImportError("FastAPI is required for the FastAPI bridge. Install it with: pip install wilco[fastapi]")

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ...registry import ComponentRegistry
from ..base import CACHE_CONTROL_IMMUTABLE, BridgeHandlers


def create_router(registry: ComponentRegistry) -> APIRouter:
    """Create an APIRouter with component serving endpoints.

    Args:
        registry: The component registry to serve components from.

    Returns:
        A FastAPI APIRouter that can be mounted on any app.

    Example:
        ```python
        from fastapi import FastAPI
        from wilco import ComponentRegistry
        from wilco.bridges.fastapi import create_router

        app = FastAPI()
        registry = ComponentRegistry(Path("./components"))
        app.include_router(create_router(registry), prefix="/api")
        ```
    """
    handlers = BridgeHandlers(registry)
    router = APIRouter()

    @router.get("/bundles")
    def list_bundles() -> list[dict]:
        """List all available bundles (basic info only)."""
        return handlers.list_bundles()

    @router.get("/bundles/{name}.js")
    def get_bundle(name: str) -> Response:
        """Get the bundled JavaScript for a component."""
        try:
            result = handlers.get_bundle(name)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))

        if result is None:
            raise HTTPException(status_code=404, detail=f"Bundle '{name}' not found")

        return Response(
            content=result.code,
            media_type="application/javascript",
            headers={"Cache-Control": CACHE_CONTROL_IMMUTABLE},
        )

    @router.get("/bundles/{name}/metadata")
    def get_bundle_metadata(name: str) -> dict:
        """Get metadata for a bundle, including content hash."""
        try:
            metadata = handlers.get_metadata(name)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        if metadata is None:
            raise HTTPException(status_code=404, detail=f"Bundle '{name}' not found")

        return metadata

    return router


__all__ = ["create_router"]
