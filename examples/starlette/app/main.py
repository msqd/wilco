"""Main Starlette application for the wilco example."""

from pathlib import Path

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles
from starlette.templating import Jinja2Templates
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from wilco import ComponentRegistry
from wilco.bridges.starlette import create_routes

from .admin import create_admin, get_preview_routes
from .database import SessionLocal
from .models import Product
from .widgets import WilcoComponentWidget


class AdminPreviewMiddleware:
    """Middleware to inject live preview scripts into Starlette-Admin pages."""

    INJECT_SCRIPTS = """
    <script src="/wilco-static/wilco/loader.js" defer></script>
    <script src="/static/wilco/admin-preview-inject.js" defer></script>
    <script src="/static/wilco/live-loader-starlette.js" defer></script>
    </body>"""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        # Only inject into admin pages
        if not path.startswith("/admin"):
            await self.app(scope, receive, send)
            return

        # Buffer the response to modify it
        body_parts: list[bytes] = []
        initial_message: Message | None = None

        async def send_wrapper(message: Message) -> None:
            nonlocal initial_message

            if message["type"] == "http.response.start":
                # Store the initial message, we'll send it later
                initial_message = message
                return

            if message["type"] == "http.response.body":
                body = message.get("body", b"")
                more_body = message.get("more_body", False)

                body_parts.append(body)

                if not more_body:
                    # Combine all body parts
                    full_body = b"".join(body_parts)

                    # Check if it's HTML and inject our scripts
                    content_type = ""
                    if initial_message:
                        headers = dict(initial_message.get("headers", []))
                        content_type = headers.get(b"content-type", b"").decode()

                    if "text/html" in content_type:
                        try:
                            html = full_body.decode("utf-8")
                            if "</body>" in html:
                                html = html.replace("</body>", self.INJECT_SCRIPTS)
                                full_body = html.encode("utf-8")
                        except UnicodeDecodeError:
                            pass

                    # Update content-length header
                    if initial_message:
                        headers = [(k, v) for k, v in initial_message.get("headers", []) if k != b"content-length"]
                        headers.append((b"content-length", str(len(full_body)).encode()))
                        initial_message["headers"] = headers
                        await send(initial_message)

                    await send(
                        {
                            "type": "http.response.body",
                            "body": full_body,
                            "more_body": False,
                        }
                    )
                return

            await send(message)

        await self.app(scope, receive, send_wrapper)


# Paths
BASE_DIR = Path(__file__).parent.parent
TEMPLATES_DIR = BASE_DIR / "resources" / "templates"
STATIC_DIR = BASE_DIR / "resources" / "static"
MEDIA_DIR = BASE_DIR / "resources" / "media"

# Wilco static files from the package
WILCO_STATIC_DIR = Path(__file__).parent.parent.parent.parent / "src" / "wilco" / "bridges" / "django" / "static"

# Component registry - use shared components from examples/common
# Add with prefix "store" so components are named store:product, store:product_list, etc.
STORE_COMPONENTS_DIR = BASE_DIR.parent / "common" / "components" / "store"
registry = ComponentRegistry()
registry.add_source(STORE_COMPONENTS_DIR, prefix="store")

# Templates
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


async def product_list(request):
    """Homepage showing all products."""
    db = SessionLocal()
    try:
        products = db.query(Product).all()

        # Convert products to props for the component
        products_data = [
            {
                "name": p.name,
                "price": float(p.price),
                "description": p.description or "",
                "imageUrl": f"/media/{p.image}" if p.image else f"https://picsum.photos/seed/{p.id}/600/400",
                "url": f"/product/{p.id}",
            }
            for p in products
        ]

        widget = WilcoComponentWidget(
            "store:product_list",
            props={"products": products_data, "title": "Our Products"},
        )

        return templates.TemplateResponse(
            request,
            "product_list.html",
            {"widget": widget},
        )
    finally:
        db.close()


async def product_detail(request):
    """Product detail page."""
    product_id = request.path_params["id"]

    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()

        if product is None:
            return templates.TemplateResponse(
                request,
                "404.html",
                {"message": "Product not found"},
                status_code=404,
            )

        widget = WilcoComponentWidget(
            "store:product",
            props={
                "name": product.name,
                "price": float(product.price),
                "description": product.description or "",
                "imageUrl": f"/media/{product.image}"
                if product.image
                else f"https://picsum.photos/seed/{product.id}/600/400",
                "mode": "detail",
            },
        )

        return templates.TemplateResponse(
            request,
            "product_detail.html",
            {"product": product, "widget": widget},
        )
    finally:
        db.close()


# Create routes
routes = [
    Route("/", product_list, name="product_list"),
    Route("/product/{id:int}", product_detail, name="product_detail"),
    Mount("/api", routes=create_routes(registry), name="api"),
    Mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static"),
    Mount("/wilco-static", StaticFiles(directory=str(WILCO_STATIC_DIR)), name="wilco_static"),
    Mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media"),
    # Preview validation endpoints
    *get_preview_routes(),
]

# Middleware
middleware = [
    Middleware(SessionMiddleware, secret_key="your-secret-key-change-in-production"),
]

# Create the application
app = Starlette(
    debug=True,
    routes=routes,
    middleware=middleware,
)

# Mount admin
admin = create_admin()
admin.mount_to(app)

# Wrap with preview middleware to inject scripts into admin pages
app = AdminPreviewMiddleware(app)
