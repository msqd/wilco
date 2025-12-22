"""Django bridge for serving wilco components.

This package provides Django integration for wilco, including:
- URL patterns for serving component bundles
- Admin widget for rendering components
- Template tags for component rendering

Usage:
    1. Add 'wilco.bridges.django' to INSTALLED_APPS
    2. Set WILCO_COMPONENTS_DIR in settings
    3. Include wilco URLs in your urlconf

Example:
    # settings.py
    INSTALLED_APPS = [
        ...
        "wilco.bridges.django",
    ]
    WILCO_COMPONENTS_DIR = BASE_DIR / "components"

    # urls.py
    from django.urls import include, path

    urlpatterns = [
        path("api/", include("wilco.bridges.django.urls")),
    ]
"""

from .apps import WilcoBridgeConfig
from .widgets import WilcoComponentWidget

default_app_config = "wilco.bridges.django.apps.WilcoBridgeConfig"

__all__ = ["WilcoBridgeConfig", "WilcoComponentWidget"]
