"""Tests for wilco.manifest module (pre-built bundle manifest reader)."""

import json
from pathlib import Path

import pytest

from wilco.manifest import Manifest, load_manifest, resolve_build_dir


class TestManifest:
    """Tests for the Manifest class."""

    def test_loads_manifest_from_directory(self, temp_dir: Path) -> None:
        """Should load manifest.json from the given directory."""
        manifest_data = {
            "counter": {"file": "counter.abc123def456.js", "hash": "abc123def456"},
        }
        (temp_dir / "manifest.json").write_text(json.dumps(manifest_data))
        (temp_dir / "counter.abc123def456.js").write_text("console.log('counter');")

        manifest = Manifest(temp_dir)
        assert manifest is not None

    def test_get_bundle_returns_bundle_result(self, temp_dir: Path) -> None:
        """get_bundle should return a BundleResult with code and hash."""
        from wilco.bundler import BundleResult

        manifest_data = {
            "counter": {"file": "counter.abc123def456.js", "hash": "abc123def456"},
        }
        (temp_dir / "manifest.json").write_text(json.dumps(manifest_data))
        (temp_dir / "counter.abc123def456.js").write_text("console.log('counter');")

        manifest = Manifest(temp_dir)
        result = manifest.get_bundle("counter")

        assert isinstance(result, BundleResult)
        assert result.code == "console.log('counter');"
        assert result.hash == "abc123def456"

    def test_get_bundle_caches_after_first_read(self, temp_dir: Path) -> None:
        """get_bundle should cache file content and not re-read from disk."""
        manifest_data = {
            "counter": {"file": "counter.abc123def456.js", "hash": "abc123def456"},
        }
        (temp_dir / "manifest.json").write_text(json.dumps(manifest_data))
        (temp_dir / "counter.abc123def456.js").write_text("original();")

        manifest = Manifest(temp_dir)
        result1 = manifest.get_bundle("counter")

        # Modify the file after first read
        (temp_dir / "counter.abc123def456.js").write_text("modified();")

        result2 = manifest.get_bundle("counter")
        assert result1 is result2  # Same cached object
        assert result2.code == "original();"

    def test_get_hash_returns_hash_without_reading_file(self, temp_dir: Path) -> None:
        """get_hash should return hash from manifest data without reading JS file."""
        manifest_data = {
            "counter": {"file": "counter.abc123def456.js", "hash": "abc123def456"},
        }
        (temp_dir / "manifest.json").write_text(json.dumps(manifest_data))
        # Intentionally don't create the JS file

        manifest = Manifest(temp_dir)
        assert manifest.get_hash("counter") == "abc123def456"
        assert manifest.get_hash("nonexistent") is None

    def test_get_bundle_returns_none_for_missing_component(self, temp_dir: Path) -> None:
        """get_bundle should return None for unknown component."""
        manifest_data = {
            "counter": {"file": "counter.abc123def456.js", "hash": "abc123def456"},
        }
        (temp_dir / "manifest.json").write_text(json.dumps(manifest_data))

        manifest = Manifest(temp_dir)
        assert manifest.get_bundle("nonexistent") is None

    def test_has_component(self, temp_dir: Path) -> None:
        """has method should return True for known components."""
        manifest_data = {
            "counter": {"file": "counter.abc123def456.js", "hash": "abc123def456"},
        }
        (temp_dir / "manifest.json").write_text(json.dumps(manifest_data))

        manifest = Manifest(temp_dir)
        assert manifest.has("counter") is True
        assert manifest.has("nonexistent") is False

    def test_components_property_returns_names(self, temp_dir: Path) -> None:
        """components property should return list of component names."""
        manifest_data = {
            "counter": {"file": "counter.abc123.js", "hash": "abc123"},
            "button": {"file": "button.def456.js", "hash": "def456"},
        }
        (temp_dir / "manifest.json").write_text(json.dumps(manifest_data))

        manifest = Manifest(temp_dir)
        names = manifest.components
        assert set(names) == {"counter", "button"}

    def test_raises_when_manifest_not_found(self, temp_dir: Path) -> None:
        """Should raise FileNotFoundError when manifest.json doesn't exist."""
        with pytest.raises(FileNotFoundError):
            Manifest(temp_dir)

    def test_raises_when_manifest_invalid_json(self, temp_dir: Path) -> None:
        """Should raise ValueError when manifest.json is not valid JSON."""
        (temp_dir / "manifest.json").write_text("not valid json{{{")
        with pytest.raises(ValueError):
            Manifest(temp_dir)


class TestLoadManifest:
    """Tests for the load_manifest convenience function."""

    def test_returns_none_when_no_manifest(self, temp_dir: Path) -> None:
        """load_manifest should return None when no manifest.json exists."""
        assert load_manifest(temp_dir) is None

    def test_returns_manifest_when_exists(self, temp_dir: Path) -> None:
        """load_manifest should return Manifest when manifest.json exists."""
        manifest_data = {"counter": {"file": "counter.abc123.js", "hash": "abc123"}}
        (temp_dir / "manifest.json").write_text(json.dumps(manifest_data))

        result = load_manifest(temp_dir)
        assert isinstance(result, Manifest)

    def test_returns_none_for_nonexistent_directory(self) -> None:
        """load_manifest should return None for a path that doesn't exist."""
        assert load_manifest(Path("/nonexistent/path")) is None


class TestResolveBuildDir:
    """Tests for the resolve_build_dir utility function."""

    def test_returns_path_from_env_var(self, temp_dir: Path, monkeypatch) -> None:
        """Should return path from WILCO_BUILD_DIR env var."""
        monkeypatch.setenv("WILCO_BUILD_DIR", str(temp_dir / "custom"))
        result = resolve_build_dir(temp_dir / "default")
        assert result == temp_dir / "custom"

    def test_returns_default_when_manifest_exists(self, temp_dir: Path, monkeypatch) -> None:
        """Should return default path when manifest.json exists there."""
        monkeypatch.delenv("WILCO_BUILD_DIR", raising=False)
        default = temp_dir / "dist" / "wilco"
        default.mkdir(parents=True)
        (default / "manifest.json").write_text("{}")
        result = resolve_build_dir(default)
        assert result == default

    def test_returns_none_when_no_manifest(self, temp_dir: Path, monkeypatch) -> None:
        """Should return None when no env var and no manifest at default path."""
        monkeypatch.delenv("WILCO_BUILD_DIR", raising=False)
        result = resolve_build_dir(temp_dir / "nonexistent")
        assert result is None

    def test_env_var_takes_precedence(self, temp_dir: Path, monkeypatch) -> None:
        """Env var should take precedence over default path."""
        monkeypatch.setenv("WILCO_BUILD_DIR", str(temp_dir / "from-env"))
        default = temp_dir / "default"
        default.mkdir(parents=True)
        (default / "manifest.json").write_text("{}")
        result = resolve_build_dir(default)
        assert result == temp_dir / "from-env"
