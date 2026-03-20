"""Tests for wilco.build module (pre-compilation of component bundles)."""

import json
from pathlib import Path
from unittest.mock import patch

from wilco.bundler import BundleResult
from wilco.registry import ComponentRegistry

from conftest import create_component_package


class TestBuildComponents:
    """Tests for build_components function."""

    def test_creates_output_directory(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Should create the output directory if it doesn't exist."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="console.log('test');", hash="abc123def456")
            build_components(registry, output_dir)

        assert output_dir.exists()

    def test_generates_manifest_json(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Should generate a manifest.json file in the output directory."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="console.log('test');", hash="abc123def456")
            build_components(registry, output_dir)

        manifest_path = output_dir / "manifest.json"
        assert manifest_path.exists()
        manifest = json.loads(manifest_path.read_text())
        assert isinstance(manifest, dict)

    def test_manifest_contains_all_components(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Manifest should have an entry for each registered component."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="console.log('test');", hash="abc123def456")
            build_components(registry, output_dir)

        manifest = json.loads((output_dir / "manifest.json").read_text())
        for name in registry.components:
            assert name in manifest
            assert "file" in manifest[name]
            assert "hash" in manifest[name]

    def test_writes_hashed_js_files(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Should write .js files with content hash in filename."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="console.log('test');", hash="abc123def456")
            build_components(registry, output_dir)

        manifest = json.loads((output_dir / "manifest.json").read_text())
        for name, entry in manifest.items():
            js_file = output_dir / entry["file"]
            assert js_file.exists(), f"JS file for '{name}' not found: {entry['file']}"
            assert js_file.read_text() == "console.log('test');"

    def test_colon_in_name_replaced_with_double_dash(self, temp_dir: Path) -> None:
        """Colons in component names should be replaced with -- in filenames."""
        from wilco.build import build_components

        components_dir = temp_dir / "components"
        components_dir.mkdir()
        create_component_package(
            components_dir,
            "product",
            tsx_content="export default function Product() { return <div>Product</div>; }",
        )

        registry = ComponentRegistry()
        registry.add_source(components_dir, prefix="store")

        output_dir = temp_dir / "output"

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="console.log('test');", hash="abc123def456")
            build_components(registry, output_dir)

        manifest = json.loads((output_dir / "manifest.json").read_text())
        assert "store:product" in manifest
        assert "--" in manifest["store:product"]["file"]
        assert ":" not in manifest["store:product"]["file"]

    def test_empty_registry_produces_empty_manifest(self, temp_dir: Path) -> None:
        """Building with no components should produce an empty manifest."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry()

        build_components(registry, output_dir)

        manifest = json.loads((output_dir / "manifest.json").read_text())
        assert manifest == {}

    def test_minify_option_passed_to_bundler(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Should pass minify option to bundle_component."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="minified;", hash="abc123def456")
            build_components(registry, output_dir, minify=True)

            for call in mock_bundle.call_args_list:
                _, kwargs = call
                assert kwargs.get("minify") is True

    def test_sourcemap_option_passed_to_bundler(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Should pass sourcemap option to bundle_component."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="code;", hash="abc123def456")
            build_components(registry, output_dir, sourcemap=True)

            for call in mock_bundle.call_args_list:
                _, kwargs = call
                assert kwargs.get("sourcemap") is True

    def test_default_minify_is_true(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Default build should produce minified output."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="code;", hash="abc123def456")
            build_components(registry, output_dir)

            for call in mock_bundle.call_args_list:
                _, kwargs = call
                assert kwargs.get("minify") is True

    def test_default_sourcemap_is_false(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Default build should not include sourcemaps."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="code;", hash="abc123def456")
            build_components(registry, output_dir)

            for call in mock_bundle.call_args_list:
                _, kwargs = call
                assert kwargs.get("sourcemap") is False

    def test_returns_build_result(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Should return a BuildResult with component count and output path."""
        from wilco.build import BuildResult, build_components

        output_dir = temp_dir / "output"
        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="code;", hash="abc123def456")
            result = build_components(registry, output_dir)

        assert isinstance(result, BuildResult)
        assert result.component_count == len(registry.components)
        assert result.output_dir == output_dir

    def test_cleans_output_directory_before_build(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Should clean the output directory before writing new files."""
        from wilco.build import build_components

        output_dir = temp_dir / "output"
        output_dir.mkdir()
        stale_file = output_dir / "old_component.abc123.js"
        stale_file.write_text("stale content")

        registry = ComponentRegistry(sample_component_dir)

        with patch("wilco.build.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="code;", hash="abc123def456")
            build_components(registry, output_dir)

        assert not stale_file.exists()


class TestSanitizeFilename:
    """Tests for the filename sanitization helper."""

    def test_replaces_colon_with_double_dash(self) -> None:
        from wilco.build import _sanitize_filename

        assert _sanitize_filename("store:product") == "store--product"

    def test_preserves_dots(self) -> None:
        from wilco.build import _sanitize_filename

        assert _sanitize_filename("widgets.counter") == "widgets.counter"

    def test_plain_name_unchanged(self) -> None:
        from wilco.build import _sanitize_filename

        assert _sanitize_filename("counter") == "counter"

    def test_multiple_colons(self) -> None:
        from wilco.build import _sanitize_filename

        assert _sanitize_filename("a:b:c") == "a--b--c"
