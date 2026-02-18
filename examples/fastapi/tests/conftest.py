"""Shared test fixtures for the FastAPI example tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models import Product


@pytest.fixture
def db_session():
    """Create an in-memory database session for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    """Create a test client with an in-memory database."""
    import app.main as main_module

    # The module-level `app` is the middleware-wrapped ASGI app.
    # Access the FastAPI instance for dependency overrides.
    fastapi_app = main_module.app
    # Walk through middleware wrapper to find the FastAPI instance
    while hasattr(fastapi_app, "app"):
        fastapi_app = fastapi_app.app

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    yield TestClient(main_module.app)
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def sample_product(db_session):
    """Create a sample product in the database."""
    product = Product(
        id=1,
        name="Test Product",
        price=29.99,
        description="A test product",
        image="products/test.jpg",
    )
    db_session.add(product)
    db_session.commit()
    return product
