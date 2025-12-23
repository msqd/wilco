"""Django bridge for serving wilco components.

This package provides Django integration for wilco, including:
- URL patterns for serving component bundles
- Admin widget for rendering components
- Admin mixin for live preview support
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

For live preview in admin:
    from wilco.bridges.django import LivePreviewAdminMixin

    @admin.register(Product)
    class ProductAdmin(LivePreviewAdminMixin, admin.ModelAdmin):
        preview_component = "store:product"
        readonly_fields = ["preview"]

        def get_preview_props(self, form_data):
            return {"name": form_data.get("name", "")}
"""

from .admin import LivePreviewAdminMixin
from .apps import WilcoBridgeConfig
from .views import get_bundle_result
from .widgets import WilcoComponentWidget

default_app_config = "wilco.bridges.django.apps.WilcoBridgeConfig"

__all__ = [
    "LivePreviewAdminMixin",
    "WilcoBridgeConfig",
    "WilcoComponentWidget",
    "get_bundle_result",
]
