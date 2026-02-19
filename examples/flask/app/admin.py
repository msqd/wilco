"""Flask-Admin configuration for the Flask example with live preview support."""

from typing import Any

from flask import jsonify, request
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView

from .database import db
from .models import Product


INJECT_SCRIPTS = """
    <script src="/wilco-static/wilco/loader.js" defer></script>
    <script src="/static/wilco/admin-preview-inject.js" defer></script>
    <script src="/static/wilco/live-loader-flask.js" defer></script>
    </body>"""


class ProductAdmin(ModelView):
    """Admin view for Product model."""

    # List view configuration
    column_list = ["id", "name", "price", "created_at"]
    column_searchable_list = ["name", "description"]
    column_filters = ["price", "created_at"]
    column_sortable_list = ["id", "name", "price", "created_at"]
    column_default_sort = ("created_at", True)

    # Form configuration
    form_columns = ["name", "price", "description", "image"]

    # Display formatting
    column_formatters = {
        "price": lambda v, c, m, p: f"${m.price:.2f}" if m.price else "-",
    }


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


def validate_preview(product_id=None):
    """Validate form data and return props for live preview."""
    if request.method != "POST":
        return "", 405

    product = None
    if product_id:
        product = db.session.query(Product).filter(Product.id == product_id).first()

    data = dict(request.form)

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
        return jsonify({"success": False, "errors": errors})

    props = get_preview_props(data, product)
    return jsonify({"success": True, "props": props})


def create_admin(app):
    """Create and configure Flask-Admin instance."""
    admin = Admin(
        app,
        name="Wilco Shop Admin",
        url="/admin",
    )

    admin.add_view(ProductAdmin(Product, db.session, name="Products"))

    # Register preview validation endpoints
    app.add_url_rule(
        "/admin/product/preview",
        "product_preview",
        validate_preview,
        methods=["GET", "POST"],
    )
    app.add_url_rule(
        "/admin/product/<int:product_id>/preview",
        "product_preview_edit",
        validate_preview,
        methods=["GET", "POST"],
    )

    # Inject preview scripts into admin pages
    @app.after_request
    def inject_preview_scripts(response):
        if request.path.startswith("/admin") and response.content_type and "text/html" in response.content_type:
            html = response.get_data(as_text=True)
            if "</body>" in html:
                html = html.replace("</body>", INJECT_SCRIPTS)
                response.set_data(html)
        return response

    return admin
