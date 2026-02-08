"""Starlette-Admin configuration for the example with live preview support."""

from typing import Any

from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route
from starlette_admin.contrib.sqla import Admin, ModelView

from .database import engine, SessionLocal
from .models import Product


class ProductAdmin(ModelView):
    """Admin view for Product model with live preview support."""

    icon = "fa fa-box"
    name = "Product"
    name_plural = "Products"

    fields = [
        "id",
        "name",
        "description",
        "price",
        "image",
        "created_at",
    ]

    # Fields shown in list view
    fields_default_sort = [("created_at", True)]

    # Searchable fields
    searchable_fields = ["name", "description"]

    # Sortable columns
    sortable_fields = ["id", "name", "price", "created_at"]

    # Fields shown in forms
    exclude_fields_from_create = ["id", "created_at"]
    exclude_fields_from_edit = ["id", "created_at"]


def get_preview_props(form_data: dict[str, Any], product: Product | None = None) -> dict[str, Any]:
    """Convert form data to component props.

    Args:
        form_data: Dictionary of form field values.
        product: The existing product instance when editing.

    Returns:
        Props for the store:product_preview component.
    """
    # Handle price
    price = form_data.get("price", 0)
    if isinstance(price, str):
        try:
            price = float(price.replace(",", ".")) if price else 0
        except ValueError:
            price = 0

    # Handle image URL
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


async def validate_preview(request: Request) -> Response:
    """Validate form data and return props for live preview.

    This endpoint accepts POST requests with form data and returns
    component props for the preview.
    """
    if request.method != "POST":
        return Response(status_code=405)

    # Get product ID from path if editing
    product_id = request.path_params.get("id")
    product = None

    if product_id:
        db = SessionLocal()
        try:
            product = db.query(Product).filter(Product.id == product_id).first()
        finally:
            db.close()

    # Parse form data
    form_data = await request.form()
    data = {key: value for key, value in form_data.items()}

    # Validate and get props
    errors = {}

    # Basic validation
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


def create_admin() -> Admin:
    """Create and configure the admin interface."""
    admin = Admin(
        engine,
        title="Wilco Store Admin",
        base_url="/admin",
    )

    # Add model views
    admin.add_view(ProductAdmin(Product))

    return admin


def get_preview_routes() -> list[Route]:
    """Get routes for preview validation endpoints."""
    return [
        Route("/admin/product/preview", validate_preview, methods=["POST"]),
        Route("/admin/product/{id:int}/preview", validate_preview, methods=["POST"]),
    ]
