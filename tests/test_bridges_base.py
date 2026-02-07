"""Tests for wilco.bridges.base shared bridge utilities."""

import time
from pathlib import Path
from unittest.mock import patch

import pytest

from wilco import BundleResult, ComponentRegistry
from wilco.bridges.base import BundleCache, CachedBundle, BridgeHandlers


class TestCachedBundle:
    """Tests for CachedBundle dataclass."""

    def test_stores_result_and_mtime(self) -> None:
        """Should store bundle result and modification time."""
        result = BundleResult(code="export default function() {}", hash="abc123")
        cached = CachedBundle(result=result, mtime=1234567890.0)

        assert cached.result is result
        assert cached.mtime == 1234567890.0

    def test_is_immutable_dataclass(self) -> None:
        """Should be a frozen dataclass."""
        result = BundleResult(code="code", hash="hash")
        cached = CachedBundle(result=result, mtime=1.0)

        with pytest.raises(AttributeError):
            cached.mtime = 2.0


class TestBundleCache:
    """Tests for BundleCache with mtime-based invalidation."""

    def test_get_returns_none_for_missing_key(self) -> None:
        """Should return None for keys not in cache."""
        cache = BundleCache()
        assert cache.get("nonexistent", mtime=1.0) is None

    def test_set_and_get_returns_cached_result(self) -> None:
        """Should cache and return bundle result."""
        cache = BundleCache()
        result = BundleResult(code="code", hash="hash")

        cache.set("component", result, mtime=100.0)
        cached = cache.get("component", mtime=100.0)

        assert cached is not None
        assert cached.code == "code"
        assert cached.hash == "hash"

    def test_get_returns_none_when_mtime_changed(self) -> None:
        """Should return None when source file mtime has changed."""
        cache = BundleCache()
        result = BundleResult(code="code", hash="hash")

        cache.set("component", result, mtime=100.0)
        # File was modified (mtime increased)
        cached = cache.get("component", mtime=200.0)

        assert cached is None

    def test_clear_removes_specific_key(self) -> None:
        """Should remove specific key from cache."""
        cache = BundleCache()
        result = BundleResult(code="code", hash="hash")

        cache.set("a", result, mtime=1.0)
        cache.set("b", result, mtime=1.0)

        cache.clear("a")

        assert cache.get("a", mtime=1.0) is None
        assert cache.get("b", mtime=1.0) is not None

    def test_clear_all_removes_everything(self) -> None:
        """Should remove all entries when no key specified."""
        cache = BundleCache()
        result = BundleResult(code="code", hash="hash")

        cache.set("a", result, mtime=1.0)
        cache.set("b", result, mtime=1.0)

        cache.clear()

        assert cache.get("a", mtime=1.0) is None
        assert cache.get("b", mtime=1.0) is None

    def test_is_thread_safe(self) -> None:
        """Should be thread-safe for concurrent access."""
        import threading

        cache = BundleCache()
        results = []

        def writer():
            for i in range(100):
                result = BundleResult(code=f"code{i}", hash=f"hash{i}")
                cache.set(f"key{i}", result, mtime=float(i))

        def reader():
            for i in range(100):
                cache.get(f"key{i}", mtime=float(i))
                results.append(i)

        threads = [
            threading.Thread(target=writer),
            threading.Thread(target=reader),
            threading.Thread(target=writer),
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Should complete without errors
        assert len(results) == 100


class TestBridgeHandlers:
    """Tests for BridgeHandlers shared endpoint logic."""

    @pytest.fixture
    def sample_registry(self, tmp_path: Path) -> ComponentRegistry:
        """Create a registry with a sample component."""
        comp_dir = tmp_path / "components" / "test_comp"
        comp_dir.mkdir(parents=True)
        (comp_dir / "__init__.py").write_text("")
        (comp_dir / "index.tsx").write_text("export default function() { return <div>Test</div>; }")
        (comp_dir / "schema.json").write_text('{"title": "Test Component"}')

        return ComponentRegistry(tmp_path / "components")

    @pytest.fixture
    def handlers(self, sample_registry: ComponentRegistry) -> BridgeHandlers:
        """Create handlers with sample registry."""
        return BridgeHandlers(sample_registry)

    def test_list_bundles_returns_component_names(self, handlers: BridgeHandlers) -> None:
        """Should return list of bundle names."""
        bundles = handlers.list_bundles()

        assert isinstance(bundles, list)
        assert len(bundles) == 1
        assert bundles[0] == {"name": "test_comp"}

    def test_list_bundles_returns_empty_for_empty_registry(self, tmp_path: Path) -> None:
        """Should return empty list for empty registry."""
        empty_dir = tmp_path / "empty"
        empty_dir.mkdir()
        registry = ComponentRegistry(empty_dir)
        handlers = BridgeHandlers(registry)

        bundles = handlers.list_bundles()
        assert bundles == []

    def test_get_bundle_returns_result_for_valid_component(self, handlers: BridgeHandlers) -> None:
        """Should return BundleResult for valid component."""
        result = handlers.get_bundle("test_comp")

        assert result is not None
        assert isinstance(result, BundleResult)
        assert len(result.code) > 0
        assert len(result.hash) > 0

    def test_get_bundle_returns_none_for_missing_component(self, handlers: BridgeHandlers) -> None:
        """Should return None for non-existent component."""
        result = handlers.get_bundle("nonexistent")
        assert result is None

    def test_get_bundle_caches_result(self, handlers: BridgeHandlers) -> None:
        """Should cache bundle result and reuse on second call."""
        with patch("wilco.bridges.base.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="code", hash="hash")

            handlers.get_bundle("test_comp")
            handlers.get_bundle("test_comp")

            # Should only bundle once due to caching
            assert mock_bundle.call_count == 1

    def test_get_bundle_invalidates_cache_on_mtime_change(
        self, handlers: BridgeHandlers, sample_registry: ComponentRegistry
    ) -> None:
        """Should re-bundle when source file changes."""
        with patch("wilco.bridges.base.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="code", hash="hash")

            # First call
            handlers.get_bundle("test_comp")

            # Simulate file modification
            component = sample_registry.get("test_comp")
            time.sleep(0.01)  # Ensure mtime changes
            component.ts_path.write_text("export default function() { return <div>Updated</div>; }")

            # Second call after modification
            handlers.get_bundle("test_comp")

            # Should bundle twice due to mtime change
            assert mock_bundle.call_count == 2

    def test_get_metadata_returns_dict_for_valid_component(self, handlers: BridgeHandlers) -> None:
        """Should return metadata dict for valid component."""
        metadata = handlers.get_metadata("test_comp")

        assert metadata is not None
        assert isinstance(metadata, dict)
        assert metadata.get("title") == "Test Component"

    def test_get_metadata_returns_none_for_missing_component(self, handlers: BridgeHandlers) -> None:
        """Should return None for non-existent component."""
        metadata = handlers.get_metadata("nonexistent")
        assert metadata is None

    def test_get_metadata_includes_bundle_hash(self, handlers: BridgeHandlers) -> None:
        """Should include bundle hash in metadata."""
        metadata = handlers.get_metadata("test_comp")

        assert metadata is not None
        assert "hash" in metadata
        assert len(metadata["hash"]) > 0

    def test_clear_cache_clears_bundle_cache(self, handlers: BridgeHandlers) -> None:
        """Should clear the bundle cache."""
        with patch("wilco.bridges.base.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="code", hash="hash")

            handlers.get_bundle("test_comp")
            handlers.clear_cache()
            handlers.get_bundle("test_comp")

            # Should bundle twice after cache clear
            assert mock_bundle.call_count == 2

    def test_clear_cache_for_specific_component(self, handlers: BridgeHandlers) -> None:
        """Should clear cache for specific component only."""
        with patch("wilco.bridges.base.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="code", hash="hash")

            # Create another component
            handlers.get_bundle("test_comp")

            handlers.clear_cache("test_comp")
            handlers.get_bundle("test_comp")

            assert mock_bundle.call_count == 2
