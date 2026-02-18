"""Simple path-based routing for the minimal WSGI example.

Uses regex patterns for URL matching.
"""

import re
from typing import Callable

# Type for route handlers
# Handler takes environ and path match groups, returns (status, content_type, body)
RouteHandler = Callable[[dict, dict[str, str]], tuple[str, str, bytes]]


class Router:
    """Simple regex-based router for WSGI."""

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

    def dispatch(
        self, method: str, path: str, environ: dict
    ) -> tuple[str, str, bytes]:
        """Dispatch a request to the appropriate handler."""
        for route_method, pattern, handler in self.routes:
            if route_method != method.upper():
                continue
            match = pattern.match(path)
            if match:
                return handler(environ, match.groupdict())

        # 404 Not Found
        return "404 Not Found", "text/html", b"<h1>404 Not Found</h1>"


# Global router instance
router = Router()
