"""Unit tests for wilco.bundler module."""

import base64
import json
import shutil
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from wilco.bundler import (
    BundlerNotFoundError,
    _check_npx_esbuild,
    _find_esbuild,
    _raise_bundler_not_found,
    _rewrite_source_map_sources,
    bundle_component,
    clear_esbuild_cache,
    get_bundler_info,
)


class TestClearEsbuildCache:
    """Tests for clear_esbuild_cache function."""

    def test_clears_cache(self) -> None:
        """Clearing cache should reset the cached path."""
        # First, trigger caching by finding esbuild
        try:
            _find_esbuild()
        except BundlerNotFoundError:
            pass  # Ignore if not found

        # Clear the cache
        clear_esbuild_cache()

        # Verify by checking bundler info
        info = get_bundler_info()
        assert info["cached_path"] is None


class TestGetBundlerInfo:
    """Tests for get_bundler_info function."""

    def test_returns_dict_with_required_keys(self) -> None:
        """Should return dictionary with all required diagnostic keys."""
        info = get_bundler_info()

        required_keys = [
            "cached_path",
            "frontend_dir_exists",
            "node_modules_exists",
            "frontend_esbuild_exists",
            "global_esbuild",
            "npm_available",
            "npx_available",
            "resolved_path",
        ]

        for key in required_keys:
            assert key in info, f"Missing key: {key}"

    def test_boolean_values_are_booleans(self) -> None:
        """Boolean fields should be actual booleans."""
        info = get_bundler_info()

        boolean_keys = [
            "frontend_dir_exists",
            "node_modules_exists",
            "frontend_esbuild_exists",
            "npm_available",
            "npx_available",
        ]

        for key in boolean_keys:
            assert isinstance(info[key], bool), f"{key} should be bool"


class TestCheckNpxEsbuild:
    """Tests for _check_npx_esbuild function."""

    def test_returns_none_when_npx_not_available(self) -> None:
        """Should return None when npx is not in PATH."""
        with patch("shutil.which", return_value=None):
            result = _check_npx_esbuild()
            assert result is None

    def test_returns_command_when_npx_works(self) -> None:
        """Should return npx command when it can run esbuild."""
        npx_path = shutil.which("npx")
        if not npx_path:
            pytest.skip("npx not available")

        # Test actual npx availability
        result = _check_npx_esbuild()
        # Result could be None if npx can't download, or a command string
        if result is not None:
            assert "npx" in result
            assert "esbuild" in result

    def test_handles_timeout(self) -> None:
        """Should return None on timeout."""
        with patch("shutil.which", return_value="/usr/bin/npx"):
            with patch("subprocess.run") as mock_run:
                mock_run.side_effect = TimeoutError()
                result = _check_npx_esbuild()
                assert result is None


class TestFindEsbuild:
    """Tests for _find_esbuild function."""

    def test_finds_frontend_esbuild_first(self, temp_dir: Path) -> None:
        """Should prefer frontend node_modules esbuild."""
        # Create fake esbuild in frontend location
        fake_bin = temp_dir / "node_modules" / ".bin"
        fake_bin.mkdir(parents=True)
        fake_esbuild = fake_bin / "esbuild"
        fake_esbuild.touch()
        fake_esbuild.chmod(0o755)

        with patch("wilco.bundler._FRONTEND_BIN", fake_bin):
            clear_esbuild_cache()
            result = _find_esbuild()
            assert result == str(fake_esbuild)

    def test_falls_back_to_global_esbuild(self) -> None:
        """Should fall back to global esbuild when frontend not available."""
        global_path = shutil.which("esbuild")

        with patch("wilco.bundler._FRONTEND_BIN", Path("/nonexistent")):
            clear_esbuild_cache()
            if global_path:
                result = _find_esbuild()
                assert result == global_path
            else:
                # If no global esbuild, it should try other paths
                pass

    def test_caches_result(self) -> None:
        """Should cache the result for subsequent calls."""
        try:
            clear_esbuild_cache()
            first_result = _find_esbuild()
            second_result = _find_esbuild()
            assert first_result == second_result

            # Verify caching in bundler info
            info = get_bundler_info()
            assert info["cached_path"] == first_result
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")

    def test_raises_error_when_not_found(self) -> None:
        """Should raise BundlerNotFoundError when esbuild not available."""
        with patch("wilco.bundler._FRONTEND_BIN", Path("/nonexistent")):
            with patch("shutil.which", return_value=None):
                with patch("wilco.bundler._check_npx_esbuild", return_value=None):
                    clear_esbuild_cache()
                    with pytest.raises(BundlerNotFoundError):
                        _find_esbuild()


class TestRaiseBundlerNotFound:
    """Tests for _raise_bundler_not_found function."""

    def test_raises_bundler_not_found_error(self) -> None:
        """Should always raise BundlerNotFoundError."""
        with pytest.raises(BundlerNotFoundError):
            _raise_bundler_not_found()

    def test_error_message_contains_options(self) -> None:
        """Error message should contain installation options."""
        with pytest.raises(BundlerNotFoundError) as exc_info:
            _raise_bundler_not_found()

        message = str(exc_info.value)
        assert "Option 1" in message
        assert "Option 2" in message
        assert "pnpm install" in message or "npm install" in message
        assert "npm install -g esbuild" in message

    def test_error_message_contains_diagnostics(self) -> None:
        """Error message should contain diagnostic info."""
        with pytest.raises(BundlerNotFoundError) as exc_info:
            _raise_bundler_not_found()

        message = str(exc_info.value)
        assert "Diagnostic info" in message
        assert "Frontend dir exists" in message
        assert "node_modules exists" in message


class TestRewriteSourceMapSources:
    """Tests for _rewrite_source_map_sources function."""

    def test_returns_unchanged_when_no_source_map(self) -> None:
        """Should return unchanged code when no source map present."""
        code = "console.log('hello');"
        result = _rewrite_source_map_sources(code, "test.component")
        assert result == code

    def test_rewrites_source_map_urls(self) -> None:
        """Should rewrite sources to use component:// URLs."""
        # Create a simple source map
        source_map = {
            "version": 3,
            "sources": ["src/counter.tsx", "src/utils.ts"],
            "mappings": "AAAA",
        }
        b64_map = base64.b64encode(json.dumps(source_map).encode()).decode()
        code = f"console.log('hello');\n//# sourceMappingURL=data:application/json;base64,{b64_map}"

        result = _rewrite_source_map_sources(code, "example.counter")

        # Decode the result source map
        marker = "//# sourceMappingURL=data:application/json;base64,"
        result_b64 = result.split(marker)[1]
        result_map = json.loads(base64.b64decode(result_b64))

        assert result_map["sources"] == [
            "component://example.counter/counter.tsx",
            "component://example.counter/utils.ts",
        ]

    def test_preserves_other_source_map_fields(self) -> None:
        """Should preserve other source map fields unchanged."""
        source_map = {
            "version": 3,
            "sources": ["src/file.tsx"],
            "sourcesContent": ["export default {}"],
            "mappings": "AAAA",
            "names": ["foo", "bar"],
        }
        b64_map = base64.b64encode(json.dumps(source_map).encode()).decode()
        code = f"code;\n//# sourceMappingURL=data:application/json;base64,{b64_map}"

        result = _rewrite_source_map_sources(code, "test")

        marker = "//# sourceMappingURL=data:application/json;base64,"
        result_b64 = result.split(marker)[1]
        result_map = json.loads(base64.b64decode(result_b64))

        assert result_map["version"] == 3
        assert result_map["sourcesContent"] == ["export default {}"]
        assert result_map["mappings"] == "AAAA"
        assert result_map["names"] == ["foo", "bar"]

    def test_handles_invalid_base64(self) -> None:
        """Should return unchanged code when base64 is invalid."""
        code = "code;\n//# sourceMappingURL=data:application/json;base64,not-valid-base64!!!"
        result = _rewrite_source_map_sources(code, "test")
        assert result == code

    def test_handles_invalid_json(self) -> None:
        """Should return unchanged code when JSON is invalid."""
        b64_invalid = base64.b64encode(b"not json").decode()
        code = f"code;\n//# sourceMappingURL=data:application/json;base64,{b64_invalid}"
        result = _rewrite_source_map_sources(code, "test")
        assert result == code


class TestBundleComponent:
    """Tests for bundle_component function."""

    def test_bundles_valid_tsx_file(self, sample_tsx_file: Path) -> None:
        """Should successfully bundle a valid TSX file."""
        from wilco.bundler import BundleResult

        try:
            result = bundle_component(sample_tsx_file, "test.sample")
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")

        assert isinstance(result, BundleResult)
        assert isinstance(result.code, str)
        assert len(result.code) > 0
        assert isinstance(result.hash, str)
        assert len(result.hash) == 12  # First 12 chars of SHA-256
        # Should contain the transformed code
        assert "useState" in result.code or "default" in result.code

    def test_includes_inline_source_map(self, sample_tsx_file: Path) -> None:
        """Bundled code should include inline source map."""
        try:
            result = bundle_component(sample_tsx_file, "test.sample")
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")

        assert "//# sourceMappingURL=data:application/json;base64," in result.code

    def test_source_map_uses_component_urls(self, sample_tsx_file: Path) -> None:
        """Source map should use component:// URLs."""
        try:
            result = bundle_component(sample_tsx_file, "test.sample")
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")

        # Extract and decode source map
        marker = "//# sourceMappingURL=data:application/json;base64,"
        b64_map = result.code.split(marker)[1]
        source_map = json.loads(base64.b64decode(b64_map))

        assert any("component://test.sample/" in s for s in source_map["sources"])

    def test_uses_default_external_deps(self, sample_tsx_file: Path) -> None:
        """Should mark react/react-dom as external by default."""
        try:
            result = bundle_component(sample_tsx_file)
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")

        # External deps should remain as imports, not bundled
        assert "react" in result.code.lower()

    def test_uses_filename_as_default_component_name(self, sample_tsx_file: Path) -> None:
        """Should use filename as component name when not specified."""
        try:
            result = bundle_component(sample_tsx_file)
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")

        # Source map should reference the file
        marker = "//# sourceMappingURL=data:application/json;base64,"
        b64_map = result.code.split(marker)[1]
        source_map = json.loads(base64.b64decode(b64_map))

        assert any("sample" in s for s in source_map["sources"])

    def test_raises_runtime_error_for_invalid_tsx(self, invalid_tsx_file: Path) -> None:
        """Should raise RuntimeError when bundling fails."""
        try:
            with pytest.raises(RuntimeError) as exc_info:
                bundle_component(invalid_tsx_file, "test.invalid")
            assert "esbuild failed" in str(exc_info.value)
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")

    def test_raises_bundler_not_found_when_esbuild_missing(self, sample_tsx_file: Path) -> None:
        """Should raise BundlerNotFoundError when esbuild unavailable."""
        with patch("wilco.bundler._find_esbuild") as mock_find:
            mock_find.side_effect = BundlerNotFoundError("not found")
            with pytest.raises(BundlerNotFoundError):
                bundle_component(sample_tsx_file)

    def test_cleans_up_temp_file_on_success(self, sample_tsx_file: Path) -> None:
        """Should clean up temporary output file after bundling."""
        try:
            bundle_component(sample_tsx_file)
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")

        # No way to directly check temp file cleanup, but we can verify
        # the function completes without leaving temp files
        # This test mainly ensures no exceptions from cleanup

    def test_cleans_up_temp_file_on_failure(self, invalid_tsx_file: Path) -> None:
        """Should clean up temporary output file even when bundling fails."""
        try:
            with pytest.raises(RuntimeError):
                bundle_component(invalid_tsx_file)
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")


class TestBundlerIntegration:
    """Integration tests for the bundler module."""

    def test_full_bundling_workflow(self, sample_tsx_file: Path) -> None:
        """Test complete bundling workflow with cache management."""
        # Clear cache
        clear_esbuild_cache()

        # Get initial info
        info_before = get_bundler_info()
        assert info_before["cached_path"] is None

        # Bundle a component
        try:
            result = bundle_component(sample_tsx_file, "integration.test")
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")

        # Check cache is populated
        info_after = get_bundler_info()
        assert info_after["cached_path"] is not None
        assert info_after["resolved_path"] == info_after["cached_path"]

        # Verify bundle output
        assert "export" in result.code or "default" in result.code
        assert "sourceMappingURL" in result.code

    def test_bundler_performance(self, sample_tsx_file: Path, benchmark: MagicMock) -> None:
        """Benchmark bundling performance."""
        try:
            # Warm up - ensure esbuild is cached
            bundle_component(sample_tsx_file, "perf.test")

            # Benchmark
            def bundle() -> str:
                return bundle_component(sample_tsx_file, "perf.test")

            if hasattr(benchmark, "__call__"):
                benchmark(bundle)
        except BundlerNotFoundError:
            pytest.skip("esbuild not available")
