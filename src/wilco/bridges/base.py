"""Shared utilities for wilco bridges.

This module provides common functionality used by all framework-specific bridges:
- Bundle caching with mtime-based invalidation
- Common handler logic for list/get/metadata operations
"""

from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Optional

from wilco import BundleResult, ComponentRegistry
from wilco.bundler import bundle_component

# Path to wilco's static files (loader.js, live-loader.js)
STATIC_DIR = Path(__file__).parent / "django" / "static"


@dataclass(frozen=True)
class CachedBundle:
    """Cached bundle with source file modification time.

    Attributes:
        result: The bundled JavaScript result.
        mtime: The modification time of the source file when bundled.
    """

    result: BundleResult
    mtime: float


class BundleCache:
    """Thread-safe bundle cache with mtime-based invalidation.

    Caches bundle results and invalidates them when the source file
    modification time changes, enabling hot-reload during development.
    """

    def __init__(self) -> None:
        self._cache: dict[str, CachedBundle] = {}
        self._lock = Lock()

    def get(self, name: str, *, mtime: float) -> Optional[BundleResult]:
        """Get cached bundle if mtime matches.

        Args:
            name: Component name.
            mtime: Current modification time of the source file.

        Returns:
            BundleResult if cached and mtime matches, None otherwise.
        """
        with self._lock:
            cached = self._cache.get(name)
            if cached is not None and cached.mtime == mtime:
                return cached.result
            return None

    def set(self, name: str, result: BundleResult, *, mtime: float) -> None:
        """Cache a bundle result with its mtime.

        Args:
            name: Component name.
            result: The bundle result to cache.
            mtime: Modification time of the source file.
        """
        with self._lock:
            self._cache[name] = CachedBundle(result=result, mtime=mtime)

    def clear(self, name: Optional[str] = None) -> None:
        """Clear cache entries.

        Args:
            name: Component name to clear, or None to clear all.
        """
        with self._lock:
            if name is None:
                self._cache.clear()
            else:
                self._cache.pop(name, None)


class BridgeHandlers:
    """Shared handler logic for bridge endpoints.

    Provides the core logic for list/get/metadata operations that all
    bridges need, with built-in caching support.

    Example:
        ```python
        registry = ComponentRegistry(Path("./components"))
        handlers = BridgeHandlers(registry)

        # List all bundles
        bundles = handlers.list_bundles()

        # Get bundle JavaScript
        result = handlers.get_bundle("counter")

        # Get bundle metadata
        metadata = handlers.get_metadata("counter")
        ```
    """

    def __init__(self, registry: ComponentRegistry) -> None:
        """Initialize handlers with a component registry.

        Args:
            registry: The component registry to serve components from.
        """
        self.registry = registry
        self._cache = BundleCache()

    def list_bundles(self) -> list[dict]:
        """List all available bundles.

        Returns:
            List of bundle info dicts with 'name' field.
        """
        return [{"name": name} for name in self.registry.components.keys()]

    def get_bundle(self, name: str) -> Optional[BundleResult]:
        """Get the bundled JavaScript for a component.

        Uses mtime-based caching for development hot-reload support.

        Args:
            name: Component name.

        Returns:
            BundleResult with code and hash, or None if not found.
        """
        component = self.registry.get(name)
        if component is None:
            return None

        # Get current source file mtime
        try:
            current_mtime = component.ts_path.stat().st_mtime
        except OSError:
            return None

        # Check cache
        cached = self._cache.get(name, mtime=current_mtime)
        if cached is not None:
            return cached

        # Bundle the component (let RuntimeError propagate as 500)
        result = bundle_component(component.ts_path, component_name=name)

        # Store in cache
        self._cache.set(name, result, mtime=current_mtime)

        return result

    def get_metadata(self, name: str) -> Optional[dict]:
        """Get metadata for a component.

        Includes the bundle hash for cache busting.

        Args:
            name: Component name.

        Returns:
            Metadata dict with title, description, props, and hash.
            None if component not found.
        """
        component = self.registry.get(name)
        if component is None:
            return None

        metadata = dict(component.metadata)

        # Include bundle hash for cache busting
        result = self.get_bundle(name)
        if result:
            metadata["hash"] = result.hash

        return metadata

    def clear_cache(self, name: Optional[str] = None) -> None:
        """Clear the bundle cache.

        Args:
            name: Component name to clear, or None to clear all.
        """
        self._cache.clear(name)


# Cache header constant used by all bridges
CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable"

__all__ = ["CachedBundle", "BundleCache", "BridgeHandlers", "CACHE_CONTROL_IMMUTABLE", "STATIC_DIR"]
