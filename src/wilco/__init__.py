"""wilco - Serve React components from Python."""

from .build import BuildResult, build_components
from .bundler import BundleResult, BundlerNotFoundError, bundle_component
from .manifest import Manifest, load_manifest, resolve_build_dir
from .registry import Component, ComponentRegistry

__version__ = "0.5.2"

__all__ = [
    "BuildResult",
    "BundleResult",
    "BundlerNotFoundError",
    "Component",
    "ComponentRegistry",
    "Manifest",
    "build_components",
    "bundle_component",
    "load_manifest",
    "resolve_build_dir",
    "__version__",
]
