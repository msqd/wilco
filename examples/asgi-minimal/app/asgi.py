"""Pure ASGI application demonstrating wilco integration without a framework.

This module implements a raw ASGI application with:
- Simple regex-based routing
- Jinja2 template rendering
- wilco component integration
- Static file serving
"""

import html as html_escape
import json
import mimetypes
import re
import uuid
from pathlib import Path
from typing import Any

from wilco import ComponentRegistry
from wilco.bridges.base import BridgeHandlers, CACHE_CONTROL_IMMUTABLE, STATIC_DIR as WILCO_STATIC_DIR

from .database import get_all_products, get_product_by_id
from .routes import router
from .templates import render_template

# Base paths
BASE_DIR = Path(__file__).parent.parent
RESOURCES_DIR = BASE_DIR / "resources"
STATIC_DIR = RESOURCES_DIR / "static"
MEDIA_DIR = RESOURCES_DIR / "media"

# wilco component registry - use shared components from examples/common
# Add with prefix "store" so components are named store:product, store:product_list, etc.
STORE_COMPONENTS_DIR = BASE_DIR.parent / "common" / "components" / "store"
registry = ComponentRegistry()
registry.add_source(STORE_COMPONENTS_DIR, prefix="store")

# Bundle handlers for serving component JavaScript
bundle_handlers = BridgeHandlers(registry)


def render_component(name: str, props: dict[str, Any], api_base: str = "/api") -> str:
    """Render a wilco component container that will be hydrated client-side.

    Args:
        name: Component name (e.g., "store:product")
        props: Props to pass to the component
        api_base: Base URL for the wilco API

    Returns:
        HTML string containing the component container
    """
    container_id = f"wilco-{uuid.uuid4().hex[:8]}"
    props_json = html_escape.escape(json.dumps(props), quote=True)

    return f'''<div id="{container_id}"
     data-wilco-component="{name}"
     data-wilco-props="{props_json}"
     data-wilco-api="{api_base}">
</div>'''


# Route handlers
@router.get("/")
async def product_list(scope: dict, params: dict[str, str]) -> tuple[int, str, bytes]:
    """Product list page."""
    products = await get_all_products()

    # Convert products to props for the component
    products_data = [
        {
            "name": p.name,
            "price": p.price,
            "description": p.description or "",
            "imageUrl": f"/media/{p.image}" if p.image else "",
            "url": f"/products/{p.id}",
        }
        for p in products
    ]

    # Render product_list component
    widget_html = render_component(
        "store:product_list",
        {"products": products_data, "title": "Our Products"},
    )

    html = render_template(
        "product_list.html",
        products=products,
        widget=widget_html,
    )
    return 200, "text/html", html.encode("utf-8")


@router.get("/products/(?P<product_id>\\d+)")
async def product_detail(
    scope: dict, params: dict[str, str]
) -> tuple[int, str, bytes]:
    """Product detail page."""
    product_id = int(params["product_id"])
    product = await get_product_by_id(product_id)

    if product is None:
        html = render_template("404.html")
        return 404, "text/html", html.encode("utf-8")

    # Render product component
    widget_html = render_component(
        "store:product",
        {
            "name": product.name,
            "description": product.description or "",
            "price": product.price,
            "imageUrl": f"/media/{product.image}" if product.image else "",
            "mode": "detail",
        },
    )

    html = render_template(
        "product_detail.html",
        product=product,
        widget=widget_html,
    )
    return 200, "text/html", html.encode("utf-8")


async def serve_static(path: str) -> tuple[int, str, bytes, dict[str, str]]:
    """Serve a static file.

    Returns:
        Tuple of (status, content_type, body, extra_headers)
    """
    extra_headers: dict[str, str] = {}

    # Determine file path, base directory, and cache headers based on URL prefix
    if path.startswith("/static/"):
        file_path = STATIC_DIR / path[8:]  # Remove /static/
        base_dir = STATIC_DIR
        extra_headers["Cache-Control"] = "public, max-age=3600"
    elif path.startswith("/media/"):
        file_path = MEDIA_DIR / path[7:]  # Remove /media/
        base_dir = MEDIA_DIR
        extra_headers["Cache-Control"] = "public, max-age=86400"
    elif path.startswith("/wilco-static/"):
        file_path = WILCO_STATIC_DIR / path[14:]  # Remove /wilco-static/
        base_dir = WILCO_STATIC_DIR
        extra_headers["Cache-Control"] = CACHE_CONTROL_IMMUTABLE
    else:
        return 404, "text/plain", b"Not Found", extra_headers

    # Security: prevent directory traversal
    try:
        file_path = file_path.resolve()
        if not file_path.is_relative_to(base_dir.resolve()):
            return 403, "text/plain", b"Forbidden", extra_headers
    except (ValueError, RuntimeError):
        return 403, "text/plain", b"Forbidden", extra_headers

    if not file_path.exists() or not file_path.is_file():
        return 404, "text/plain", b"Not Found", extra_headers

    # Determine content type
    content_type, _ = mimetypes.guess_type(str(file_path))
    if content_type is None:
        content_type = "application/octet-stream"

    # Read and return file
    with open(file_path, "rb") as f:
        content = f.read()

    return 200, content_type, content, extra_headers


# API endpoints for component bundles
async def api_list_bundles() -> tuple[int, str, bytes, dict[str, str]]:
    """List all available bundles."""
    bundles = bundle_handlers.list_bundles()
    return 200, "application/json", json.dumps(bundles).encode("utf-8"), {}


async def api_get_bundle(name: str) -> tuple[int, str, bytes, dict[str, str]]:
    """Get bundled JavaScript for a component."""
    try:
        result = bundle_handlers.get_bundle(name)
    except ValueError:
        error = {"detail": f"Invalid component name: '{name}'"}
        return 422, "application/json", json.dumps(error).encode("utf-8"), {}

    if result is None:
        error = {"detail": f"Bundle '{name}' not found"}
        return 404, "application/json", json.dumps(error).encode("utf-8"), {}

    return 200, "application/javascript", result.code.encode("utf-8"), {
        "Cache-Control": CACHE_CONTROL_IMMUTABLE
    }


async def api_get_metadata(name: str) -> tuple[int, str, bytes, dict[str, str]]:
    """Get metadata for a component."""
    try:
        metadata = bundle_handlers.get_metadata(name)
    except ValueError:
        error = {"detail": f"Invalid component name: '{name}'"}
        return 422, "application/json", json.dumps(error).encode("utf-8"), {}

    if metadata is None:
        error = {"detail": f"Bundle '{name}' not found"}
        return 404, "application/json", json.dumps(error).encode("utf-8"), {}

    return 200, "application/json", json.dumps(metadata).encode("utf-8"), {}


# Regex patterns for API routes
BUNDLE_JS_PATTERN = re.compile(r"^/api/bundles/([^/]+)\.js$")
BUNDLE_METADATA_PATTERN = re.compile(r"^/api/bundles/([^/]+)/metadata$")


async def app(scope: dict, receive, send) -> None:
    """Pure ASGI application callable."""
    if scope["type"] != "http":
        return

    method = scope["method"]
    path = scope["path"]
    extra_headers: dict[str, str] = {}

    # Handle static/media/wilco-static files
    if path.startswith("/static/") or path.startswith("/media/") or path.startswith("/wilco-static/"):
        status, content_type, body, extra_headers = await serve_static(path)
    # Handle API endpoints
    elif path == "/api/bundles" and method == "GET":
        status, content_type, body, extra_headers = await api_list_bundles()
    elif match := BUNDLE_JS_PATTERN.match(path):
        if method == "GET":
            name = match.group(1)
            status, content_type, body, extra_headers = await api_get_bundle(name)
        else:
            status, content_type, body = 405, "text/plain", b"Method Not Allowed"
    elif match := BUNDLE_METADATA_PATTERN.match(path):
        if method == "GET":
            name = match.group(1)
            status, content_type, body, extra_headers = await api_get_metadata(name)
        else:
            status, content_type, body = 405, "text/plain", b"Method Not Allowed"
    else:
        # Route to handlers
        status, content_type, body = await router.dispatch(method, path, scope)

    # Build headers
    headers: list[list[bytes]] = [
        [b"content-type", content_type.encode("utf-8")],
        [b"content-length", str(len(body)).encode("utf-8")],
    ]
    for key, value in extra_headers.items():
        headers.append([key.encode("utf-8"), value.encode("utf-8")])

    # Send response
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": headers,
        }
    )
    await send(
        {
            "type": "http.response.body",
            "body": body,
        }
    )
