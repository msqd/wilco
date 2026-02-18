"""Data models for the minimal WSGI example.

Uses simple dataclasses instead of an ORM.
"""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Product:
    """Product model."""

    id: int
    name: str
    description: str
    price: float
    image: str
    created_at: datetime

    def to_dict(self) -> dict:
        """Convert to dictionary for template rendering."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "image": self.image,
            "created_at": self.created_at.isoformat(),
        }
