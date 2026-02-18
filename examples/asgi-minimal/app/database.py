"""Database module for the minimal ASGI example.

Uses aiosqlite for async SQLite access.
"""

import asyncio
import json
import shutil
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import AsyncIterator

import aiosqlite

from .models import Product

# Database path
DB_PATH = Path(__file__).parent.parent / "resources" / "db.sqlite3"

# Fixtures path
FIXTURES_PATH = Path(__file__).parent.parent.parent / "common" / "fixtures"


@asynccontextmanager
async def get_connection() -> AsyncIterator[aiosqlite.Connection]:
    """Get a database connection as an async context manager."""
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    try:
        yield conn
    finally:
        await conn.close()


async def init_database() -> None:
    """Initialize the database schema."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    async with get_connection() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await conn.commit()


async def load_fixtures() -> None:
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

    async with get_connection() as conn:
        # Check if products already exist
        cursor = await conn.execute("SELECT COUNT(*) FROM products")
        row = await cursor.fetchone()
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

            await conn.execute(
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
        await conn.commit()
        print(f"Loaded {len(products)} products")


async def get_all_products() -> list[Product]:
    """Get all products from the database."""
    async with get_connection() as conn:
        cursor = await conn.execute(
            "SELECT id, name, description, price, image, created_at FROM products ORDER BY id"
        )
        rows = await cursor.fetchall()
        return [
            Product(
                id=row["id"],
                name=row["name"],
                description=row["description"] or "",
                price=row["price"],
                image=row["image"] or "",
                created_at=datetime.fromisoformat(row["created_at"])
                if row["created_at"]
                else datetime.now(),
            )
            for row in rows
        ]


async def get_product_by_id(product_id: int) -> Product | None:
    """Get a single product by ID."""
    async with get_connection() as conn:
        cursor = await conn.execute(
            "SELECT id, name, description, price, image, created_at FROM products WHERE id = ?",
            (product_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return Product(
            id=row["id"],
            name=row["name"],
            description=row["description"] or "",
            price=row["price"],
            image=row["image"] or "",
            created_at=datetime.fromisoformat(row["created_at"])
            if row["created_at"]
            else datetime.now(),
        )


async def setup() -> None:
    """Set up the database and load fixtures."""
    await init_database()
    await load_fixtures()


# CLI entry point
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "setup":
        asyncio.run(setup())
    else:
        print("Usage: python -m app.database setup")
