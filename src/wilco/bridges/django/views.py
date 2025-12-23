"""Django views for serving wilco component bundles."""

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from threading import Lock

from django.apps import apps
from django.conf import settings
from django.http import Http404, HttpResponse, JsonResponse

from wilco import BundleResult, ComponentRegistry
from wilco.bundler import bundle_component


@dataclass
class CachedBundle:
    """Cached bundle with source file modification time."""

    result: BundleResult
    mtime: float


# Bundle cache: component name -> CachedBundle
_bundle_cache: dict[str, CachedBundle] = {}
_bundle_cache_lock = Lock()


def clear_bundle_cache(name: str | None = None) -> None:
    """Clear the bundle cache.

    Args:
        name: Component name to clear, or None to clear all.
    """
    with _bundle_cache_lock:
        if name is None:
            _bundle_cache.clear()
        else:
            _bundle_cache.pop(name, None)


@lru_cache(maxsize=1)
def get_registry() -> ComponentRegistry:
    """Get or create the component registry with autodiscovery.

    The registry is cached for performance. In development, you may need
    to restart the server to pick up new components.

    Components are discovered from:
    1. WILCO_COMPONENTS_DIR setting (if configured)
    2. Each installed Django app's "components/" subdirectory (if exists)

    App components are prefixed with the app label, e.g., "store:product".

    Settings:
        WILCO_COMPONENTS_DIR: Optional path to main components directory.
        WILCO_AUTODISCOVER: Whether to auto-discover from Django apps (default: True).

    Returns:
        ComponentRegistry instance with all discovered components.
    """
    registry = ComponentRegistry()

    # Add main components dir if configured
    main_dir = getattr(settings, "WILCO_COMPONENTS_DIR", None)
    if main_dir is not None:
        registry.add_source(Path(main_dir))

    # Auto-discover from Django apps
    if getattr(settings, "WILCO_AUTODISCOVER", True):
        for app_config in apps.get_app_configs():
            components_dir = Path(app_config.path) / "components"
            if components_dir.is_dir():
                registry.add_source(components_dir, prefix=app_config.label)

    return registry


def get_bundle_result(name: str) -> BundleResult | None:
    """Get bundle result for a component, using cache with mtime invalidation.

    Args:
        name: Component name (e.g., "counter" or "store:product")

    Returns:
        BundleResult with code and hash, or None if component not found.
    """
    registry = get_registry()
    component = registry.get(name)

    if component is None:
        return None

    # Get current source file mtime
    try:
        current_mtime = component.ts_path.stat().st_mtime
    except OSError:
        return None

    # Check cache
    with _bundle_cache_lock:
        cached = _bundle_cache.get(name)
        if cached is not None and cached.mtime == current_mtime:
            return cached.result

    # Bundle the component
    try:
        result = bundle_component(component.ts_path, component_name=name)
    except RuntimeError:
        return None

    # Store in cache
    with _bundle_cache_lock:
        _bundle_cache[name] = CachedBundle(result=result, mtime=current_mtime)

    return result


def list_bundles(request) -> JsonResponse:
    """List all available component bundles.

    Returns:
        JSON array of bundle names: [{"name": "component_name"}, ...]
    """
    registry = get_registry()
    bundles = [{"name": name} for name in registry.components.keys()]
    return JsonResponse(bundles, safe=False)


def get_bundle(request, name: str) -> HttpResponse:
    """Get the bundled JavaScript for a component.

    Args:
        name: Component name (e.g., "counter" or "store:product")

    Returns:
        JavaScript bundle with long cache headers.
        The client should include a hash query parameter for cache busting.

    Raises:
        Http404: If component not found or bundling fails.
    """
    result = get_bundle_result(name)

    if result is None:
        raise Http404(f"Bundle '{name}' not found")

    return HttpResponse(
        result.code,
        content_type="application/javascript",
        headers={
            # Long cache since URL includes hash query param for cache busting
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    )


def get_metadata(request, name: str) -> JsonResponse:
    """Get metadata for a component bundle.

    Args:
        name: Component name (e.g., "counter" or "store:product")

    Returns:
        JSON object with component metadata (title, description, props schema, hash).

    Raises:
        Http404: If component not found.
    """
    registry = get_registry()
    component = registry.get(name)

    if component is None:
        raise Http404(f"Bundle '{name}' not found")

    # Get bundle result to include hash
    result = get_bundle_result(name)

    metadata = dict(component.metadata)
    if result:
        metadata["hash"] = result.hash

    return JsonResponse(metadata)
