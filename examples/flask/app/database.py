"""Database configuration for the Flask example."""

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


db = SQLAlchemy(model_class=Base)


def create_tables():
    """Create all database tables."""
    from .main import create_app
    from . import models  # noqa: F401 - Import models to register them

    app = create_app()
    with app.app_context():
        db.create_all()
        print("Database tables created.")
