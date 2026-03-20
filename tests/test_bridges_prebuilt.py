"""Tests for bridge pre-built bundle support (via BridgeHandlers)."""

import json
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from wilco import ComponentRegistry
from wilco.bridges.base import BridgeHandlers
from wilco.bridges.fastapi import create_router
from wilco.bundler import BundleResult


def _setup_prebuilt(temp_dir: Path, components: dict[str, str]) -> Path:
    """Helper to create a pre-built bundles directory with manifest."""
    build_dir = temp_dir / "build"
    build_dir.mkdir()

    manifest = {}
    for name, code in components.items():
        safe_name = name.replace(":", "--")
        filename = f"{safe_name}.abc123def456.js"
        (build_dir / filename).write_text(code)
        manifest[name] = {"file": filename, "hash": "abc123def456"}

    (build_dir / "manifest.json").write_text(json.dumps(manifest))
    return build_dir


class TestBridgeHandlersPrebuilt:
    """Tests for BridgeHandlers with pre-built bundles."""

    def test_accepts_build_dir(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """BridgeHandlers should accept build_dir parameter."""
        registry = ComponentRegistry(sample_component_dir)
        build_dir = _setup_prebuilt(temp_dir, {"widgets.counter": "prebuilt();"})

        handlers = BridgeHandlers(registry, build_dir=build_dir)
        assert handlers is not None

    def test_serves_prebuilt_bundle(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Should serve pre-built bundle when available."""
        registry = ComponentRegistry(sample_component_dir)
        build_dir = _setup_prebuilt(temp_dir, {"widgets.counter": "prebuilt_code();"})

        handlers = BridgeHandlers(registry, build_dir=build_dir)

        with patch("wilco.bridges.base.bundle_component") as mock_bundle:
            result = handlers.get_bundle("widgets.counter")

            assert result is not None
            assert result.code == "prebuilt_code();"
            assert result.hash == "abc123def456"
            mock_bundle.assert_not_called()

    def test_falls_back_to_live_bundling(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Should fall back to live bundling for components not in manifest."""
        registry = ComponentRegistry(sample_component_dir)
        build_dir = _setup_prebuilt(temp_dir, {"widgets.counter": "prebuilt();"})

        handlers = BridgeHandlers(registry, build_dir=build_dir)

        with patch("wilco.bridges.base.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="live();", hash="livehash12345")
            result = handlers.get_bundle("widgets.simple")

            assert result is not None
            assert result.code == "live();"
            mock_bundle.assert_called_once()

    def test_no_build_dir_uses_live_bundling(self, sample_component_dir: Path) -> None:
        """Without build_dir, should use live bundling."""
        registry = ComponentRegistry(sample_component_dir)
        handlers = BridgeHandlers(registry)

        with patch("wilco.bridges.base.bundle_component") as mock_bundle:
            mock_bundle.return_value = BundleResult(code="live();", hash="livehash12345")
            result = handlers.get_bundle("widgets.counter")

            assert result is not None
            mock_bundle.assert_called_once()

    def test_prebuilt_metadata_includes_hash(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Metadata should return hash from manifest without live bundling."""
        registry = ComponentRegistry(sample_component_dir)
        build_dir = _setup_prebuilt(temp_dir, {"widgets.counter": "prebuilt();"})

        handlers = BridgeHandlers(registry, build_dir=build_dir)

        with patch("wilco.bridges.base.bundle_component") as mock_bundle:
            metadata = handlers.get_metadata("widgets.counter")

            assert metadata is not None
            assert metadata["hash"] == "abc123def456"
            mock_bundle.assert_not_called()


class TestFastAPIPrebuilt:
    """Tests for FastAPI bridge with pre-built bundles via create_router."""

    def test_create_router_accepts_build_dir(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """create_router should accept a build_dir parameter."""
        registry = ComponentRegistry(sample_component_dir)
        build_dir = _setup_prebuilt(temp_dir, {"widgets.counter": "prebuilt();"})

        router = create_router(registry, build_dir=build_dir)
        assert router is not None

    def test_serves_prebuilt_via_endpoint(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """FastAPI endpoint should serve pre-built bundle."""
        registry = ComponentRegistry(sample_component_dir)
        build_dir = _setup_prebuilt(temp_dir, {"widgets.counter": "prebuilt_code();"})

        app = FastAPI()
        router = create_router(registry, build_dir=build_dir)
        app.include_router(router, prefix="/api")

        with TestClient(app) as client:
            with patch("wilco.bridges.base.bundle_component") as mock_bundle:
                response = client.get("/api/bundles/widgets.counter.js")

                assert response.status_code == 200
                assert response.text == "prebuilt_code();"
                mock_bundle.assert_not_called()
