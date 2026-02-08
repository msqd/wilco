"""Load sample product data from common fixtures."""

import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from .database import SessionLocal
from .models import Product


def load_fixtures():
    """Load sample products from the common fixtures file."""
    fixtures_path = Path(__file__).parent.parent.parent / "common" / "fixtures" / "sample_products.json"

    if not fixtures_path.exists():
        print(f"Fixtures file not found: {fixtures_path}")
        return

    with open(fixtures_path) as f:
        products_data = json.load(f)

    db = SessionLocal()
    try:
        # Check if products already exist
        existing = db.query(Product).first()
        if existing:
            print("Products already loaded, skipping.")
            return

        for data in products_data:
            product = Product(
                id=data["id"],
                name=data["name"],
                description=data.get("description", ""),
                price=Decimal(data["price"]),
                image=data.get("image", ""),
                created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
            )
            db.add(product)

        db.commit()
        print(f"Loaded {len(products_data)} products.")
    finally:
        db.close()


if __name__ == "__main__":
    load_fixtures()
