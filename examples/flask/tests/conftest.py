"""Shared test fixtures for the Flask example tests."""

import pytest

from app.main import create_app
from app.database import db as _db
from app.models import Product


@pytest.fixture
def app():
    """Create a test Flask application with an in-memory database."""
    app = create_app(
        test_config={
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        }
    )

    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture
def sample_product(app):
    """Create a sample product in the database."""
    product = Product(
        id=1,
        name="Test Product",
        price=29.99,
        description="A test product",
        image="products/test.jpg",
    )
    _db.session.add(product)
    _db.session.commit()
    return product
