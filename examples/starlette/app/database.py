"""Database configuration for the Starlette example."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Database file in the example directory
DATABASE_URL = "sqlite:///db.sqlite3"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


def get_db():
    """Dependency for getting a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables."""
    from . import models  # noqa: F401 - Import models to register them

    Base.metadata.create_all(bind=engine)
    print("Database tables created.")
