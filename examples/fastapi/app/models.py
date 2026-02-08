"""SQLAlchemy models for the store."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, Text, Numeric, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Product(Base):
    """Product model for the store."""

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    image: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Product {self.name}>"
