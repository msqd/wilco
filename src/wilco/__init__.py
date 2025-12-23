"""wilco - Serve React components from Python."""

from .bundler import BundleResult, BundlerNotFoundError, bundle_component
from .registry import Component, ComponentRegistry

__version__ = "0.1.2"

__all__ = [
    "Component",
    "ComponentRegistry",
    "BundleResult",
    "bundle_component",
    "BundlerNotFoundError",
    "__version__",
]
