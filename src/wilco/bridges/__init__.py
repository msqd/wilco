"""wilco.bridges - Web framework integrations.

This module provides lazy imports for framework bridges.
Each bridge requires its framework to be installed:

    pip install wilco[fastapi]  # For FastAPI bridge
    pip install wilco[django]   # For Django bridge
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .fastapi import create_router as create_router


def __getattr__(name: str):
    """Lazy import with helpful error messages."""
    if name == "create_router":
        from .fastapi import create_router

        return create_router

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["create_router"]
