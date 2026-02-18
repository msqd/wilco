"""Load sample fixture data into the database."""

import json
from decimal import Decimal
from pathlib import Path


def load_fixtures():
    """Load sample products from the common fixtures directory."""
    from .main import create_app
    from .database import db
    from .models import Product

    app = create_app()
    fixtures_file = Path(__file__).parent.parent.parent / "common" / "fixtures" / "sample_products.json"

    with app.app_context():
        # Check if products already exist
        if db.session.query(Product).count() > 0:
            print("Products already loaded, skipping...")
            return

        with open(fixtures_file) as f:
            data = json.load(f)

        for item in data:
            product = Product(
                id=item["id"],
                name=item["name"],
                description=item.get("description", ""),
                price=Decimal(str(item["price"])),
                image=item.get("image", ""),
            )
            db.session.add(product)

        db.session.commit()
        print(f"Loaded {len(data)} products.")


if __name__ == "__main__":
    load_fixtures()
