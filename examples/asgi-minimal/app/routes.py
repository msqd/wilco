"""Simple path-based routing for the minimal ASGI example.

Uses regex patterns for URL matching.
"""

import re
from typing import Any, Callable, Coroutine

# Type for route handlers
RouteHandler = Callable[[dict, dict[str, str]], Coroutine[Any, Any, tuple[int, str, bytes]]]


class Router:
    """Simple regex-based router."""

    def __init__(self):
        self.routes: list[tuple[str, re.Pattern, RouteHandler]] = []

    def add_route(self, method: str, pattern: str, handler: RouteHandler) -> None:
        """Add a route with a regex pattern."""
        compiled = re.compile(f"^{pattern}$")
        self.routes.append((method.upper(), compiled, handler))

    def get(self, pattern: str) -> Callable[[RouteHandler], RouteHandler]:
        """Decorator for GET routes."""

        def decorator(handler: RouteHandler) -> RouteHandler:
            self.add_route("GET", pattern, handler)
            return handler

        return decorator

    async def dispatch(
        self, method: str, path: str, scope: dict
    ) -> tuple[int, str, bytes]:
        """Dispatch a request to the appropriate handler."""
        for route_method, pattern, handler in self.routes:
            if route_method != method.upper():
                continue
            match = pattern.match(path)
            if match:
                return await handler(scope, match.groupdict())

        # 404 Not Found
        return 404, "text/html", b"<h1>404 Not Found</h1>"


# Global router instance
router = Router()
