"""FastAPI application entry point."""

from pathlib import Path

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqladmin import Admin

from wilco import ComponentRegistry
from wilco.bridges.fastapi import create_router

from .database import engine, get_db
from .models import Product
from .admin import ProductAdmin

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
STATIC_DIR = Path(__file__).parent.parent / "resources" / "static"
MEDIA_DIR = Path(__file__).parent.parent / "resources" / "media"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# SQLAdmin for admin panel
admin = Admin(app, engine, title="Wilco Shop Admin")
admin.add_view(ProductAdmin)

# Wilco component registry - point to the wilco examples directory
WILCO_COMPONENTS_DIR = Path(__file__).parent.parent.parent.parent / "src" / "wilco" / "examples"
registry = ComponentRegistry(WILCO_COMPONENTS_DIR)

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
