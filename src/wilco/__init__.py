"""wilco - Serve React components from Python."""

from .bundler import BundlerNotFoundError, bundle_component
from .registry import Component, ComponentRegistry

__version__ = "0.1.0"

__all__ = [
    "Component",
    "ComponentRegistry",
    "bundle_component",
    "BundlerNotFoundError",
    "__version__",
]
