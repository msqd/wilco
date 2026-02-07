"""Starlette bridge for serving wilco components.

Requires: pip install wilco[starlette]

Example:
    ```python
    from starlette.applications import Starlette
    from starlette.routing import Mount
    from wilco import ComponentRegistry
    from wilco.bridges.starlette import create_routes

    registry = ComponentRegistry(Path("./components"))
    routes = create_routes(registry)

    app = Starlette(routes=[
        Mount("/api", routes=routes),
    ])
    ```
"""

import importlib.util

if importlib.util.find_spec("starlette") is None:
    raise ImportError("Starlette is required for the Starlette bridge. Install it with: pip install wilco[starlette]")

from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

from wilco import ComponentRegistry
from wilco.bridges.base import CACHE_CONTROL_IMMUTABLE, BridgeHandlers


def create_routes(registry: ComponentRegistry) -> list[Route]:
    """Create Starlette routes for component serving.

    Args:
        registry: The component registry to serve components from.

    Returns:
        A list of Starlette Route objects that can be mounted on any app.

    Example:
        ```python
        from starlette.applications import Starlette
        from starlette.routing import Mount
        from wilco import ComponentRegistry
        from wilco.bridges.starlette import create_routes

        registry = ComponentRegistry(Path("./components"))
        routes = create_routes(registry)

        app = Starlette(routes=[
            Mount("/api", routes=routes),
        ])
        ```
    """
    handlers = BridgeHandlers(registry)

    async def list_bundles(request: Request) -> JSONResponse:
        """List all available bundles."""
        bundles = handlers.list_bundles()
        return JSONResponse(bundles)

    async def get_bundle(request: Request) -> Response:
        """Get the bundled JavaScript for a component."""
        name = request.path_params["name"]

        try:
            result = handlers.get_bundle(name)
        except ValueError:
            return JSONResponse(
                {"detail": f"Invalid component name: '{name}'"},
                status_code=422,
            )

        if result is None:
            return JSONResponse(
                {"detail": f"Bundle '{name}' not found"},
                status_code=404,
            )

        return Response(
            content=result.code,
            media_type="application/javascript",
            headers={"Cache-Control": CACHE_CONTROL_IMMUTABLE},
        )

    async def get_metadata(request: Request) -> JSONResponse:
        """Get metadata for a component."""
        name = request.path_params["name"]

        try:
            metadata = handlers.get_metadata(name)
        except ValueError:
            return JSONResponse(
                {"detail": f"Invalid component name: '{name}'"},
                status_code=422,
            )

        if metadata is None:
            return JSONResponse(
                {"detail": f"Bundle '{name}' not found"},
                status_code=404,
            )

        return JSONResponse(metadata)

    return [
        Route("/bundles", list_bundles, methods=["GET"]),
        Route("/bundles/{name}.js", get_bundle, methods=["GET"]),
        Route("/bundles/{name}/metadata", get_metadata, methods=["GET"]),
    ]


__all__ = ["create_routes"]
