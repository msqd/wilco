"""Django views for serving wilco component bundles."""

from functools import lru_cache
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.http import Http404, HttpResponse, JsonResponse

from wilco import BundleResult, ComponentRegistry
from wilco.bridges.base import CACHE_CONTROL_IMMUTABLE, BridgeHandlers


@lru_cache(maxsize=1)
def get_registry() -> ComponentRegistry:
    """Get or create the component registry with autodiscovery.

    The registry is cached for performance. In development, you may need
    to restart the server to pick up new components.

    Components are discovered from:
    1. WILCO_COMPONENT_SOURCES setting (if configured) - list of (path, prefix) tuples
    2. Each installed Django app's "components/" subdirectory (if exists)

    App components are prefixed with the app label, e.g., "store:product".

    Settings:
        WILCO_COMPONENT_SOURCES: Optional list of (path, prefix) tuples for explicit sources.
        WILCO_AUTODISCOVER: Whether to auto-discover from Django apps (default: True).

    Returns:
        ComponentRegistry instance with all discovered components.
    """
    registry = ComponentRegistry()

    # Add explicit component sources if configured
    sources = getattr(settings, "WILCO_COMPONENT_SOURCES", None)
    if sources is not None:
        for path, prefix in sources:
            registry.add_source(Path(path), prefix=prefix)

    # Auto-discover from Django apps
    if getattr(settings, "WILCO_AUTODISCOVER", True):
        for app_config in apps.get_app_configs():
            components_dir = Path(app_config.path) / "components"
            if components_dir.is_dir():
                registry.add_source(components_dir, prefix=app_config.label)

    return registry


@lru_cache(maxsize=1)
def _get_handlers() -> BridgeHandlers:
    """Get or create the BridgeHandlers instance."""
    return BridgeHandlers(get_registry())


def get_bundle_result(name: str) -> BundleResult | None:
    """Get bundle result for a component, using cache with mtime invalidation.

    Args:
        name: Component name (e.g., "counter" or "store:product")

    Returns:
        BundleResult with code and hash, or None if component not found.
    """
    return _get_handlers().get_bundle(name)


def clear_bundle_cache(name: str | None = None) -> None:
    """Clear the bundle cache.

    Args:
        name: Component name to clear, or None to clear all.
    """
    _get_handlers().clear_cache(name)


def list_bundles(request) -> JsonResponse:
    """List all available component bundles.

    Returns:
        JSON array of bundle names: [{"name": "component_name"}, ...]
    """
    bundles = _get_handlers().list_bundles()
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
        result.code.encode("utf-8"),
        content_type="application/javascript; charset=utf-8",
        headers={
            "Cache-Control": CACHE_CONTROL_IMMUTABLE,
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
    metadata = _get_handlers().get_metadata(name)

    if metadata is None:
        raise Http404(f"Bundle '{name}' not found")

    return JsonResponse(metadata)
