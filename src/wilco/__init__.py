"""wilco - Serve React components from Python."""

from .bundler import BundleResult, BundlerNotFoundError, bundle_component
from .registry import Component, ComponentRegistry

__version__ = "0.3.0"

__all__ = [
    "Component",
    "ComponentRegistry",
    "BundleResult",
    "bundle_component",
    "BundlerNotFoundError",
    "__version__",
]
