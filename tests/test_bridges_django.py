"""Tests for wilco.bridges.django package."""

import json
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


# Skip all tests if Django is not installed
django = pytest.importorskip("django")


@pytest.fixture(scope="module", autouse=True)
def setup_django_once():
    """Configure Django settings once for all tests."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tests.django_settings")

    from django.conf import settings

    if not settings.configured:
        components_dir = Path(__file__).parent.parent / "src" / "wilco" / "examples"
        settings.configure(
            DEBUG=True,
            DATABASES={},
            INSTALLED_APPS=[
                "django.contrib.contenttypes",
                "django.contrib.auth",
            ],
            USE_TZ=True,
            WILCO_COMPONENTS_DIR=components_dir,
            WILCO_AUTODISCOVER=False,
        )

    import django

    django.setup()


class TestWilcoComponentWidget:
    """Tests for WilcoComponentWidget."""

    def test_render_returns_html_string(self) -> None:
        """Should return an HTML string."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("counter")
        html = widget.render()

        assert isinstance(html, str)
        assert len(html) > 0

    def test_render_includes_container_div(self) -> None:
        """Should include a container div with data attributes."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("counter")
        html = widget.render()

        assert "<div" in html
        assert 'data-wilco-component="counter"' in html

    def test_render_includes_props_as_json(self) -> None:
        """Should include props as JSON in data attribute."""
        from wilco.bridges.django import WilcoComponentWidget

        props = {"name": "Test", "count": 42}
        widget = WilcoComponentWidget("counter", props=props)
        html = widget.render()

        assert "data-wilco-props" in html
        # Check that JSON is properly escaped in attribute
        assert '"name"' in html or "&quot;name&quot;" in html

    def test_render_includes_api_base(self) -> None:
        """Should include API base URL in data attribute."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("counter", api_base="/custom/api")
        html = widget.render()

        assert 'data-wilco-api="/custom/api"' in html

    def test_render_includes_loader_script(self) -> None:
        """Should include the loader script tag."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("counter")
        html = widget.render()

        assert '<script src="/static/wilco/loader.js"' in html

    def test_unique_container_ids(self) -> None:
        """Each widget instance should have a unique container ID."""
        from wilco.bridges.django import WilcoComponentWidget

        widget1 = WilcoComponentWidget("counter")
        widget2 = WilcoComponentWidget("counter")

        assert widget1.container_id != widget2.container_id

    def test_container_id_format(self) -> None:
        """Container ID should have wilco prefix."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("counter")

        assert widget.container_id.startswith("wilco-")

    def test_str_returns_rendered_html(self) -> None:
        """__str__ should return the rendered HTML."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("counter")

        assert str(widget) == widget.render()

    def test_html_returns_rendered_html(self) -> None:
        """__html__ should return the rendered HTML."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("counter")

        assert widget.__html__() == widget.render()

    def test_default_api_base(self) -> None:
        """Default API base should be /api."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("counter")

        assert widget.api_base == "/api"

    def test_default_props_empty_dict(self) -> None:
        """Default props should be empty dict."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("counter")

        assert widget.props == {}

    def test_props_are_json_serialized(self) -> None:
        """Props should be serialized as valid JSON in data attribute."""
        from wilco.bridges.django import WilcoComponentWidget

        props = {"text": "Hello <World>", "count": 42, "active": True}
        widget = WilcoComponentWidget("counter", props=props)
        html = widget.render()

        # Extract props JSON from the HTML
        import re

        match = re.search(r"data-wilco-props='([^']*)'", html)
        assert match is not None

        props_json = match.group(1)
        parsed = json.loads(props_json)

        assert parsed == props

    def test_component_name_with_prefix(self) -> None:
        """Should handle component names with prefix (e.g., store:product)."""
        from wilco.bridges.django import WilcoComponentWidget

        widget = WilcoComponentWidget("store:product")
        html = widget.render()

        assert 'data-wilco-component="store:product"' in html


class TestDjangoViews:
    """Tests for Django views."""

    @pytest.fixture(autouse=True)
    def clear_registry_cache(self):
        """Clear the registry cache before each test."""
        from wilco.bridges.django.views import get_registry

        get_registry.cache_clear()
        yield
        get_registry.cache_clear()

    def test_list_bundles_returns_json(self) -> None:
        """list_bundles should return JsonResponse."""
        from django.http import JsonResponse

        from wilco.bridges.django.views import list_bundles

        request = MagicMock()
        response = list_bundles(request)

        assert isinstance(response, JsonResponse)

    def test_get_bundle_returns_404_for_unknown(self) -> None:
        """get_bundle should raise Http404 for unknown component."""
        from django.http import Http404

        from wilco.bridges.django.views import get_bundle

        request = MagicMock()

        with pytest.raises(Http404):
            get_bundle(request, "nonexistent.component")

    def test_get_metadata_returns_404_for_unknown(self) -> None:
        """get_metadata should raise Http404 for unknown component."""
        from django.http import Http404

        from wilco.bridges.django.views import get_metadata

        request = MagicMock()

        with pytest.raises(Http404):
            get_metadata(request, "nonexistent.component")

    def test_get_registry_returns_component_registry(self) -> None:
        """get_registry should return a ComponentRegistry instance."""
        from wilco import ComponentRegistry
        from wilco.bridges.django.views import get_registry

        registry = get_registry()

        assert isinstance(registry, ComponentRegistry)

    def test_get_registry_is_cached(self) -> None:
        """get_registry should return the same instance on repeated calls."""
        from wilco.bridges.django.views import get_registry

        registry1 = get_registry()
        registry2 = get_registry()

        assert registry1 is registry2


class TestDjangoViewsWithComponents:
    """Tests for Django views with actual components."""

    @pytest.fixture(autouse=True)
    def setup_components(self):
        """Ensure components directory is configured."""
        from django.conf import settings

        from wilco.bridges.django.views import get_registry

        components_dir = Path(__file__).parent.parent / "src" / "wilco" / "examples"
        settings.WILCO_COMPONENTS_DIR = components_dir
        settings.WILCO_AUTODISCOVER = False

        get_registry.cache_clear()
        yield
        get_registry.cache_clear()

    def test_list_bundles_returns_components(self) -> None:
        """list_bundles should return available components."""
        from wilco.bridges.django.views import list_bundles

        request = MagicMock()
        response = list_bundles(request)

        # Parse JSON from response
        data = json.loads(response.content)
        names = [b["name"] for b in data]

        assert len(names) > 0
        assert "counter" in names

    def test_get_metadata_returns_component_metadata(self) -> None:
        """get_metadata should return component metadata."""
        from wilco.bridges.django.views import get_metadata

        request = MagicMock()
        response = get_metadata(request, "counter")

        data = json.loads(response.content)

        assert "title" in data
        assert data["title"] == "Counter"

    def test_get_bundle_returns_javascript(self) -> None:
        """get_bundle should return JavaScript code."""
        from wilco.bridges.django.views import get_bundle

        request = MagicMock()

        try:
            response = get_bundle(request, "counter")
        except Exception:
            pytest.skip("esbuild not available")

        assert response["Content-Type"] == "application/javascript"
        assert "Cache-Control" in response
        assert response["Cache-Control"] == "no-cache"

    def test_get_bundle_contains_valid_js(self) -> None:
        """get_bundle should return valid JavaScript."""
        from wilco.bridges.django.views import get_bundle

        request = MagicMock()

        try:
            response = get_bundle(request, "counter")
        except Exception:
            pytest.skip("esbuild not available")

        content = response.content.decode("utf-8")

        assert len(content) > 0
        assert "export" in content or "default" in content


class TestDjangoAutoDiscovery:
    """Tests for Django app autodiscovery."""

    @pytest.fixture(autouse=True)
    def setup_autodiscovery(self):
        """Configure for autodiscovery testing."""
        from django.conf import settings

        from wilco.bridges.django.views import get_registry

        # Save original settings
        original_components_dir = getattr(settings, "WILCO_COMPONENTS_DIR", None)
        original_autodiscover = getattr(settings, "WILCO_AUTODISCOVER", True)

        settings.WILCO_COMPONENTS_DIR = None
        settings.WILCO_AUTODISCOVER = True

        get_registry.cache_clear()

        yield

        # Restore original settings
        settings.WILCO_COMPONENTS_DIR = original_components_dir
        settings.WILCO_AUTODISCOVER = original_autodiscover
        get_registry.cache_clear()

    def test_registry_created_with_autodiscover_enabled(self) -> None:
        """Registry should be created when autodiscover is enabled."""
        from wilco import ComponentRegistry
        from wilco.bridges.django.views import get_registry

        registry = get_registry()

        assert isinstance(registry, ComponentRegistry)

    def test_autodiscover_disabled_skips_app_discovery(self) -> None:
        """When autodiscover is disabled, apps should not be scanned."""
        from django.conf import settings

        from wilco.bridges.django.views import get_registry

        settings.WILCO_AUTODISCOVER = False
        settings.WILCO_COMPONENTS_DIR = None
        get_registry.cache_clear()

        registry = get_registry()

        # With no components dir and autodiscover disabled,
        # registry should be empty
        assert len(registry.components) == 0


class TestURLPatterns:
    """Tests for Django URL patterns."""

    def test_urlpatterns_defined(self) -> None:
        """URL patterns should be defined."""
        from wilco.bridges.django.urls import urlpatterns

        assert len(urlpatterns) == 3

    def test_bundles_list_url(self) -> None:
        """Should have bundles list URL."""
        from wilco.bridges.django.urls import urlpatterns

        paths = [p.pattern.regex.pattern for p in urlpatterns]
        assert any("bundles" in p for p in paths)

    def test_bundle_js_url(self) -> None:
        """Should have bundle .js URL."""
        from wilco.bridges.django.urls import urlpatterns

        paths = [str(p.pattern) for p in urlpatterns]
        assert any(".js" in p for p in paths)

    def test_metadata_url(self) -> None:
        """Should have metadata URL."""
        from wilco.bridges.django.urls import urlpatterns

        paths = [str(p.pattern) for p in urlpatterns]
        assert any("metadata" in p for p in paths)
