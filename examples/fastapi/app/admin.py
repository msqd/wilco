"""SQLAdmin configuration for the store with live preview support."""

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqladmin import ModelView

from .database import get_db
from .models import Product


class ProductAdmin(ModelView, model=Product):
    """Admin view for Product model."""

    name = "Product"
    name_plural = "Products"
    icon = "fa-solid fa-box"

    column_list = [Product.id, Product.name, Product.price, Product.created_at]
    column_searchable_list = [Product.name, Product.description]
    column_sortable_list = [Product.id, Product.name, Product.price, Product.created_at]

    form_columns = [Product.name, Product.price, Product.description, Product.image]


def get_preview_props(form_data: dict[str, Any], product: Product | None = None) -> dict[str, Any]:
    """Convert form data to component props.

    Args:
        form_data: Dictionary of form field values.
        product: The existing product instance when editing.

    Returns:
        Props for the store:product_preview component.
    """
    price = form_data.get("price", 0)
    if isinstance(price, str):
        try:
            price = float(price.replace(",", ".")) if price else 0
        except ValueError:
            price = 0

    image = form_data.get("image", "")
    if image:
        image_url = f"/media/{image}"
    elif product and product.image:
        image_url = f"/media/{product.image}"
    else:
        image_url = "https://picsum.photos/seed/placeholder/600/400"

    return {
        "name": form_data.get("name", ""),
        "price": float(price),
        "description": form_data.get("description", "") or "",
        "imageUrl": image_url,
    }


preview_router = APIRouter()


@preview_router.post("/admin/product/preview")
async def validate_preview_create(request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    """Validate form data and return props for live preview (create mode)."""
    return await _validate_preview(request, db)


@preview_router.post("/admin/product/{product_id:int}/preview")
async def validate_preview_edit(
    request: Request, product_id: int, db: Session = Depends(get_db)
) -> JSONResponse:
    """Validate form data and return props for live preview (edit mode)."""
    return await _validate_preview(request, db, product_id=product_id)


async def _validate_preview(
    request: Request, db: Session, product_id: int | None = None
) -> JSONResponse:
    """Validate form data and return props for live preview."""
    product = None

    if product_id:
        product = db.query(Product).filter(Product.id == product_id).first()

    form_data = await request.form()
    data = {key: value for key, value in form_data.items()}

    errors = {}

    if not data.get("name"):
        errors["name"] = ["Name is required"]

    price = data.get("price", "")
    if not price:
        errors["price"] = ["Price is required"]
    else:
        try:
            float(str(price).replace(",", "."))
        except ValueError:
            errors["price"] = ["Invalid price format"]

    if errors:
        return JSONResponse({"success": False, "errors": errors})

    props = get_preview_props(data, product)
    return JSONResponse({"success": True, "props": props})
