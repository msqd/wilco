"""FastAPI bridge for serving components."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from ..bundler import bundle_component
from ..registry import ComponentRegistry


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
    router = APIRouter()

    @router.get("/bundles")
    def list_bundles() -> list[dict]:
        """List all available bundles (basic info only)."""
        return [{"name": name} for name in registry.components.keys()]

    @router.get("/bundles/{name}.js")
    def get_bundle(name: str) -> Response:
        """Get the bundled JavaScript for a component."""
        component = registry.get(name)
        if component is None:
            raise HTTPException(status_code=404, detail=f"Bundle '{name}' not found")

        try:
            result = bundle_component(component.ts_path, component_name=name)
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e))

        return Response(
            content=result.code,
            media_type="application/javascript",
            headers={"Cache-Control": "public, max-age=31536000, immutable"},
        )

    @router.get("/bundles/{name}/metadata")
    def get_bundle_metadata(name: str) -> dict:
        """Get metadata for a bundle, including content hash."""
        component = registry.get(name)
        if component is None:
            raise HTTPException(status_code=404, detail=f"Bundle '{name}' not found")

        metadata = dict(component.metadata)

        # Include bundle hash for cache busting
        try:
            result = bundle_component(component.ts_path, component_name=name)
            metadata["hash"] = result.hash
        except RuntimeError:
            pass  # Skip hash if bundling fails

        return metadata

    return router
