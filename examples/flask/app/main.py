"""Main Flask application for the wilco example."""

from pathlib import Path

from flask import Flask, abort, render_template, send_from_directory

from wilco import ComponentRegistry
from wilco.bridges.base import STATIC_DIR as WILCO_STATIC_DIR
from wilco.bridges.flask import create_blueprint

from .admin import create_admin
from .database import db
from .models import Product
from .widgets import WilcoComponentWidget

# Paths
BASE_DIR = Path(__file__).parent.parent
TEMPLATES_DIR = BASE_DIR / "resources" / "templates"
STATIC_DIR = BASE_DIR / "resources" / "static"
MEDIA_DIR = BASE_DIR / "resources" / "media"

# Component registry - use shared components from examples/common
STORE_COMPONENTS_DIR = BASE_DIR.parent / "common" / "components" / "store"


def create_app(test_config=None):
    """Create and configure the Flask application."""
    app = Flask(
        __name__,
        template_folder=str(TEMPLATES_DIR),
        static_folder=str(STATIC_DIR),
    )

    # Configuration
    app.config["SECRET_KEY"] = "your-secret-key-change-in-production"
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    if test_config:
        app.config.update(test_config)

    # Initialize extensions
    db.init_app(app)

    # Component registry
    registry = ComponentRegistry()
    registry.add_source(STORE_COMPONENTS_DIR, prefix="store")

    # Register wilco API blueprint
    app.register_blueprint(create_blueprint(registry), url_prefix="/api")

    # Register admin
    create_admin(app)

    # Routes
    @app.route("/")
    def product_list():
        """Homepage showing all products."""
        products = db.session.query(Product).all()

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

        return render_template("product_list.html", widget=widget)

    @app.route("/product/<int:product_id>/")
    def product_detail(product_id):
        """Product detail page."""
        product = db.session.query(Product).filter(Product.id == product_id).first()

        if product is None:
            abort(404)

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

        return render_template("product_detail.html", product=product, widget=widget)

    # Media files route
    @app.route("/media/<path:filename>")
    def media(filename):
        """Serve media files."""
        return send_from_directory(str(MEDIA_DIR), filename)

    # Wilco static files route
    @app.route("/wilco-static/<path:filename>")
    def wilco_static(filename):
        """Serve wilco static files."""
        return send_from_directory(str(WILCO_STATIC_DIR), filename)

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        """Handle 404 errors."""
        return render_template("404.html", message="Page not found"), 404

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=8002)
