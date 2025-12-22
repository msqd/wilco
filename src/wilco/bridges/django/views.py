"""Django views for serving wilco component bundles."""

from functools import lru_cache
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.http import Http404, HttpResponse, JsonResponse

from wilco import ComponentRegistry
from wilco.bundler import bundle_component


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
        JavaScript bundle with Cache-Control: no-cache header.

    Raises:
        Http404: If component not found or bundling fails.
    """
    registry = get_registry()
    component = registry.get(name)

    if component is None:
        raise Http404(f"Bundle '{name}' not found")

    try:
        js_code = bundle_component(component.ts_path, component_name=name)
    except RuntimeError as e:
        raise Http404(f"Bundle error: {e}")

    return HttpResponse(
        js_code,
        content_type="application/javascript",
        headers={"Cache-Control": "no-cache"},
    )


def get_metadata(request, name: str) -> JsonResponse:
    """Get metadata for a component bundle.

    Args:
        name: Component name (e.g., "counter" or "store:product")

    Returns:
        JSON object with component metadata (title, description, props schema).

    Raises:
        Http404: If component not found.
    """
    registry = get_registry()
    component = registry.get(name)

    if component is None:
        raise Http404(f"Bundle '{name}' not found")

    return JsonResponse(component.metadata)
