"""Tests for wilco.bridges.django.finders (WilcoBundleFinder)."""

import json
import os
from pathlib import Path

import pytest

django = pytest.importorskip("django")


@pytest.fixture(scope="module", autouse=True)
def setup_django():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tests.django_settings")
    from django.conf import settings

    if not settings.configured:
        settings.configure(
            DEBUG=True,
            DATABASES={},
            INSTALLED_APPS=["django.contrib.contenttypes", "wilco.bridges.django"],
            USE_TZ=True,
            WILCO_BUILD_DIR=None,
            STATIC_URL="/static/",
        )
    django.setup()


class TestWilcoBundleFinder:
    """Tests for the WilcoBundleFinder staticfiles finder."""

    def _make_finder(self, build_dir):
        from django.conf import settings

        from wilco.bridges.django.finders import WilcoBundleFinder

        original = getattr(settings, "WILCO_BUILD_DIR", None)
        settings.WILCO_BUILD_DIR = str(build_dir)
        try:
            finder = WilcoBundleFinder()
        finally:
            settings.WILCO_BUILD_DIR = original
        return finder

    def test_find_returns_path_for_existing_file(self, temp_dir: Path) -> None:
        """find() should return the full path for files under wilco/ prefix."""
        build_dir = temp_dir / "build"
        build_dir.mkdir()
        (build_dir / "manifest.json").write_text("{}")

        finder = self._make_finder(build_dir)
        result = finder.find("wilco/manifest.json")

        assert result != ""
        assert "manifest.json" in result

    def test_find_returns_none_for_missing_file(self, temp_dir: Path) -> None:
        """find() should return None for non-existent files (not empty string).

        Regression test for #16: returning '' caused Django's finders.find()
        to wrap it into [''], breaking downstream consumers like whitenoise.
        """
        build_dir = temp_dir / "build"
        build_dir.mkdir()

        finder = self._make_finder(build_dir)
        result = finder.find("wilco/nonexistent.js")

        assert result is None

    def test_find_returns_none_for_non_wilco_prefix(self, temp_dir: Path) -> None:
        """find() should return None for paths not starting with wilco/."""
        build_dir = temp_dir / "build"
        build_dir.mkdir()
        (build_dir / "manifest.json").write_text("{}")

        finder = self._make_finder(build_dir)
        result = finder.find("other/manifest.json")

        assert result is None

    def test_find_rejects_path_traversal(self, temp_dir: Path) -> None:
        """find() must reject paths that escape the build directory."""
        build_dir = temp_dir / "build"
        build_dir.mkdir()

        # Create a sensitive file outside build dir
        sensitive = temp_dir / "secret.txt"
        sensitive.write_text("sensitive data")

        finder = self._make_finder(build_dir)
        result = finder.find("wilco/../secret.txt")

        assert result is None

    def test_find_rejects_deep_traversal(self, temp_dir: Path) -> None:
        """find() must reject deeply nested traversal attempts."""
        build_dir = temp_dir / "build"
        build_dir.mkdir()

        finder = self._make_finder(build_dir)
        result = finder.find("wilco/../../../etc/passwd")

        assert result is None

    def test_find_with_all_returns_list(self, temp_dir: Path) -> None:
        """find(all=True) should return a list."""
        build_dir = temp_dir / "build"
        build_dir.mkdir()
        (build_dir / "manifest.json").write_text("{}")

        finder = self._make_finder(build_dir)
        result = finder.find("wilco/manifest.json", all=True)

        assert isinstance(result, list)
        assert len(result) == 1

    def test_list_yields_all_files(self, temp_dir: Path) -> None:
        """list() should yield all files in the build directory."""
        build_dir = temp_dir / "build"
        bundles_dir = build_dir / "bundles"
        bundles_dir.mkdir(parents=True)
        (build_dir / "manifest.json").write_text("{}")
        (bundles_dir / "counter.abc123.js").write_text("code")

        finder = self._make_finder(build_dir)
        files = list(finder.list([]))

        paths = [path for path, storage in files]
        assert "manifest.json" in paths
        # bundles/counter.abc123.js should be in the list
        assert any("counter" in p for p in paths)

    def test_list_empty_when_no_build_dir(self) -> None:
        """list() should yield nothing when WILCO_BUILD_DIR is not set."""
        from django.conf import settings

        from wilco.bridges.django.finders import WilcoBundleFinder

        original = getattr(settings, "WILCO_BUILD_DIR", None)
        settings.WILCO_BUILD_DIR = None
        try:
            finder = WilcoBundleFinder()
            files = list(finder.list([]))
            assert files == []
        finally:
            settings.WILCO_BUILD_DIR = original


class TestManifestPathTraversal:
    """Tests for path traversal protection in Manifest.get_bundle."""

    def test_get_bundle_rejects_traversal_in_manifest(self, temp_dir: Path) -> None:
        """get_bundle must not read files outside the build directory."""
        from wilco.manifest import Manifest

        sensitive = temp_dir / "secret.txt"
        sensitive.write_text("sensitive data")

        build_dir = temp_dir / "build"
        build_dir.mkdir()
        manifest_data = {
            "evil": {"file": "../secret.txt", "hash": "abc123"},
        }
        (build_dir / "manifest.json").write_text(json.dumps(manifest_data))

        manifest = Manifest(build_dir)
        result = manifest.get_bundle("evil")

        assert result is None

    def test_get_bundle_handles_missing_file(self, temp_dir: Path) -> None:
        """get_bundle should return None when referenced file doesn't exist."""
        from wilco.manifest import Manifest

        build_dir = temp_dir / "build"
        build_dir.mkdir()
        manifest_data = {
            "counter": {"file": "bundles/counter.abc123.js", "hash": "abc123"},
        }
        (build_dir / "manifest.json").write_text(json.dumps(manifest_data))
        # Intentionally do NOT create the JS file

        manifest = Manifest(build_dir)
        result = manifest.get_bundle("counter")

        assert result is None


class TestTemplateTagXSS:
    """Tests for XSS protection in wilco_component template tag."""

    def test_component_name_is_escaped(self) -> None:
        """component_name with HTML chars must be escaped."""
        from wilco.bridges.django.templatetags.wilco_tags import wilco_component

        result = str(wilco_component('"><script>alert(1)</script>'))
        assert "<script>" not in result
        assert "&lt;" in result or "&quot;" in result

    def test_api_base_is_escaped(self) -> None:
        """api_base with HTML chars must be escaped."""
        from wilco.bridges.django.templatetags.wilco_tags import wilco_component

        result = str(wilco_component("counter", api_base='"><script>alert(1)</script>'))
        assert "<script>" not in result


class TestGetLoaderScriptTag:
    """Tests for get_loader_script_tag utility."""

    def test_returns_api_loader_when_no_build_dir(self, monkeypatch) -> None:
        """Should return plain loader when no build dir configured."""
        from django.conf import settings

        from wilco.bridges.django.utils import get_loader_script_tag, is_static_mode

        monkeypatch.delenv("WILCO_BUILD_DIR", raising=False)
        original = getattr(settings, "WILCO_BUILD_DIR", None)
        settings.WILCO_BUILD_DIR = None
        is_static_mode.cache_clear()
        try:
            result = get_loader_script_tag()
            assert "data-wilco-manifest" not in result
            assert "loader.js" in result
        finally:
            settings.WILCO_BUILD_DIR = original
            is_static_mode.cache_clear()

    def test_returns_static_loader_when_manifest_exists(self, temp_dir: Path, monkeypatch) -> None:
        """Should include data-wilco-manifest when build dir has manifest."""
        from django.conf import settings

        from wilco.bridges.django.utils import get_loader_script_tag, is_static_mode

        build_dir = temp_dir / "build"
        build_dir.mkdir()
        (build_dir / "manifest.json").write_text("{}")

        monkeypatch.setenv("WILCO_BUILD_DIR", str(build_dir))
        original = getattr(settings, "WILCO_BUILD_DIR", None)
        settings.WILCO_BUILD_DIR = str(build_dir)
        is_static_mode.cache_clear()
        try:
            result = get_loader_script_tag()
            assert "data-wilco-manifest" in result
        finally:
            settings.WILCO_BUILD_DIR = original
            is_static_mode.cache_clear()

    def test_empty_env_var_disables_static_mode(self, temp_dir: Path, monkeypatch) -> None:
        """WILCO_BUILD_DIR='' should disable static mode even if manifest exists."""
        from django.conf import settings

        from wilco.bridges.django.utils import get_loader_script_tag, is_static_mode

        build_dir = temp_dir / "build"
        build_dir.mkdir()
        (build_dir / "manifest.json").write_text("{}")

        monkeypatch.setenv("WILCO_BUILD_DIR", "")
        original = getattr(settings, "WILCO_BUILD_DIR", None)
        settings.WILCO_BUILD_DIR = str(build_dir)
        is_static_mode.cache_clear()
        try:
            result = get_loader_script_tag()
            assert "data-wilco-manifest" not in result
        finally:
            settings.WILCO_BUILD_DIR = original
            is_static_mode.cache_clear()
