"""Fixture loading for sample data."""

import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from .database import SessionLocal
from .models import Product


FIXTURES_FILE = Path(__file__).parent.parent / "resources" / "fixtures" / "sample_products.json"


def load_fixtures() -> None:
    """Load sample products from fixtures file."""
    if not FIXTURES_FILE.exists():
        print(f"Fixtures file not found: {FIXTURES_FILE}")
        return

    with open(FIXTURES_FILE) as f:
        products_data = json.load(f)

    db = SessionLocal()
    try:
        # Check if products already exist
        existing_count = db.query(Product).count()
        if existing_count > 0:
            print(f"Products already loaded ({existing_count} products). Skipping fixtures.")
            return

        # Load products
        for product_data in products_data:
            product = Product(
                id=product_data["id"],
                name=product_data["name"],
                description=product_data["description"],
                price=Decimal(product_data["price"]),
                image=product_data.get("image", ""),
                created_at=datetime.fromisoformat(product_data["created_at"].replace("Z", "+00:00")),
            )
            db.add(product)

        db.commit()
        print(f"Loaded {len(products_data)} products from fixtures.")
    finally:
        db.close()
