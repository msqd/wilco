"""Database module for the minimal WSGI example.

Uses the standard library sqlite3 for synchronous SQLite access.
"""

import json
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

from .models import Product

# Database path
DB_PATH = Path(__file__).parent.parent / "resources" / "db.sqlite3"

# Fixtures path
FIXTURES_PATH = Path(__file__).parent.parent.parent / "common" / "fixtures"


def get_connection() -> sqlite3.Connection:
    """Get a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database() -> None:
    """Initialize the database schema."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


def load_fixtures() -> None:
    """Load sample products from fixtures."""
    fixtures_file = FIXTURES_PATH / "sample_products.json"
    if not fixtures_file.exists():
        print(f"Fixtures file not found: {fixtures_file}")
        return

    with open(fixtures_file) as f:
        products = json.load(f)

    # Copy images to media directory
    media_dir = Path(__file__).parent.parent / "resources" / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    # Images are in common/fixtures/images/
    images_base_dir = FIXTURES_PATH / "images"

    with get_connection() as conn:
        # Check if products already exist
        cursor = conn.execute("SELECT COUNT(*) FROM products")
        row = cursor.fetchone()
        if row[0] > 0:
            print("Products already loaded, skipping fixtures")
            return

        for product in products:
            # Copy image if it exists
            # Image field contains "products/teeshirt.jpg" - use as both source path and dest path
            image_path = product.get("image", "")
            if image_path:
                src_image = images_base_dir / image_path
                dest_image = media_dir / image_path
                # Create destination subdirectory if needed
                dest_image.parent.mkdir(parents=True, exist_ok=True)
                if src_image.exists():
                    shutil.copy(src_image, dest_image)

            conn.execute(
                """
                INSERT INTO products (name, description, price, image, created_at)
                VALUES (?, ?, ?, ?, ?)
            """,
                (
                    product["name"],
                    product["description"],
                    product["price"],
                    product.get("image", ""),
                    datetime.now().isoformat(),
                ),
            )
        conn.commit()
        print(f"Loaded {len(products)} products")


def get_all_products() -> list[Product]:
    """Get all products from the database."""
    with get_connection() as conn:
        cursor = conn.execute("SELECT id, name, description, price, image, created_at FROM products ORDER BY id")
        rows = cursor.fetchall()
        return [
            Product(
                id=row["id"],
                name=row["name"],
                description=row["description"] or "",
                price=row["price"],
                image=row["image"] or "",
                created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.now(),
            )
            for row in rows
        ]


def get_product_by_id(product_id: int) -> Product | None:
    """Get a single product by ID."""
    with get_connection() as conn:
        cursor = conn.execute(
            "SELECT id, name, description, price, image, created_at FROM products WHERE id = ?",
            (product_id,),
        )
        row = cursor.fetchone()
        if row is None:
            return None
        return Product(
            id=row["id"],
            name=row["name"],
            description=row["description"] or "",
            price=row["price"],
            image=row["image"] or "",
            created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.now(),
        )


def setup() -> None:
    """Set up the database and load fixtures."""
    init_database()
    load_fixtures()


# CLI entry point
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "setup":
        setup()
    else:
        print("Usage: python -m app.database setup")
