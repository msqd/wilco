"""Database configuration and session management."""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_PATH = Path(__file__).parent.parent / "db.sqlite3"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


def create_tables() -> None:
    """Create all database tables."""
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")


def get_db():
    """Dependency for getting database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
