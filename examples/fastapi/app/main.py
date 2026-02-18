"""FastAPI application entry point."""

from pathlib import Path

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqladmin import Admin
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from wilco import ComponentRegistry
from wilco.bridges.base import STATIC_DIR as WILCO_STATIC_DIR
from wilco.bridges.fastapi import create_router

from .database import engine, get_db
from .models import Product
from .admin import ProductAdmin, preview_router

BASE_DIR = Path(__file__).parent.parent


class AdminPreviewMiddleware:
    """ASGI middleware to inject live preview scripts into SQLAdmin pages."""

    INJECT_SCRIPTS = """
    <script src="/wilco-static/wilco/loader.js" defer></script>
    <script src="/static/wilco/admin-preview-inject.js" defer></script>
    <script src="/static/wilco/live-loader-fastapi.js" defer></script>
    </body>"""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        if not path.startswith("/admin"):
            await self.app(scope, receive, send)
            return

        body_parts: list[bytes] = []
        initial_message: Message | None = None

        async def send_wrapper(message: Message) -> None:
            nonlocal initial_message

            if message["type"] == "http.response.start":
                initial_message = message
                return

            if message["type"] == "http.response.body":
                body = message.get("body", b"")
                more_body = message.get("more_body", False)

                body_parts.append(body)

                if not more_body:
                    full_body = b"".join(body_parts)

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


# Create FastAPI app
app = FastAPI(
    title="Wilco Shop",
    description="Example FastAPI ecommerce site showcasing wilco integration",
    version="0.1.0",
)

# CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
STATIC_DIR = BASE_DIR / "resources" / "static"
MEDIA_DIR = BASE_DIR / "resources" / "media"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
app.mount("/wilco-static", StaticFiles(directory=str(WILCO_STATIC_DIR)), name="wilco_static")

# Preview validation endpoints (must be registered before SQLAdmin to take priority)
app.include_router(preview_router)

# SQLAdmin for admin panel
admin = Admin(app, engine, title="Wilco Shop Admin")
admin.add_view(ProductAdmin)

# Wilco component registry - use shared components from examples/common
STORE_COMPONENTS_DIR = BASE_DIR.parent / "common" / "components" / "store"
registry = ComponentRegistry()
registry.add_source(STORE_COMPONENTS_DIR, prefix="store")

# Mount wilco API router
app.include_router(create_router(registry), prefix="/api")


# API endpoints for products
@app.get("/api/products")
def list_products(db: Session = Depends(get_db)) -> list[dict]:
    """List all products."""
    products = db.query(Product).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "price": float(p.price),
            "description": p.description or "",
            "imageUrl": f"/media/{p.image}" if p.image else f"https://picsum.photos/seed/{p.id}/600/400",
        }
        for p in products
    ]


@app.get("/api/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)) -> dict:
    """Get a single product by ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Product not found")

    return {
        "id": product.id,
        "name": product.name,
        "price": float(product.price),
        "description": product.description or "",
        "imageUrl": f"/media/{product.image}" if product.image else f"https://picsum.photos/seed/{product.id}/600/400",
    }


# Wrap with preview middleware to inject scripts into admin pages
app = AdminPreviewMiddleware(app)
