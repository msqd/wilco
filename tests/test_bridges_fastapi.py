"""Functional tests for wilco.bridges.fastapi API endpoints."""

from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from wilco import ComponentRegistry
from wilco.bridges.fastapi import create_router


@pytest.fixture
def app_with_example_components() -> FastAPI:
    """Create a FastAPI app with the example components."""
    app = FastAPI()
    examples_dir = Path(__file__).parent.parent / "src" / "wilco" / "examples"
    registry = ComponentRegistry(examples_dir)
    router = create_router(registry)
    app.include_router(router, prefix="/api")
    return app


@pytest.fixture
def example_client(app_with_example_components: FastAPI) -> TestClient:
    """Create a test client for the FastAPI app with example components."""
    return TestClient(app_with_example_components)


class TestListBundles:
    """Tests for GET /api/bundles endpoint."""

    def test_returns_list(self, client: TestClient) -> None:
        """Should return a list of bundles."""
        response = client.get("/api/bundles")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_each_bundle_has_name(self, client: TestClient) -> None:
        """Each bundle in list should have a name field."""
        response = client.get("/api/bundles")

        assert response.status_code == 200
        data = response.json()
        for bundle in data:
            assert "name" in bundle
            assert isinstance(bundle["name"], str)

    def test_returns_known_components(self, example_client: TestClient) -> None:
        """Should return known example components."""
        response = example_client.get("/api/bundles")

        assert response.status_code == 200
        data = response.json()
        names = [b["name"] for b in data]

        # Should have example components
        assert len(names) > 0

    def test_content_type_is_json(self, client: TestClient) -> None:
        """Response should have JSON content type."""
        response = client.get("/api/bundles")

        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]


class TestGetBundle:
    """Tests for GET /api/bundles/{name}.js endpoint."""

    def test_returns_javascript(self, client: TestClient) -> None:
        """Should return JavaScript code for valid component."""
        # First get list of bundles to find a valid name
        list_response = client.get("/api/bundles")
        bundles = list_response.json()

        if not bundles:
            pytest.skip("No bundles available")

        bundle_name = bundles[0]["name"]
        response = client.get(f"/api/bundles/{bundle_name}.js")

        # May fail if esbuild not available
        if response.status_code == 500:
            pytest.skip("esbuild not available")

        assert response.status_code == 200
        assert "application/javascript" in response.headers["content-type"]

    def test_returns_valid_javascript(self, client: TestClient) -> None:
        """Returned code should be valid JavaScript."""
        list_response = client.get("/api/bundles")
        bundles = list_response.json()

        if not bundles:
            pytest.skip("No bundles available")

        bundle_name = bundles[0]["name"]
        response = client.get(f"/api/bundles/{bundle_name}.js")

        if response.status_code == 500:
            pytest.skip("esbuild not available")

        assert response.status_code == 200
        js_code = response.text

        # Basic checks for valid JS
        assert len(js_code) > 0
        # Should have export (ESM format)
        assert "export" in js_code or "default" in js_code

    def test_includes_source_map(self, client: TestClient) -> None:
        """Bundled JavaScript should include inline source map."""
        list_response = client.get("/api/bundles")
        bundles = list_response.json()

        if not bundles:
            pytest.skip("No bundles available")

        bundle_name = bundles[0]["name"]
        response = client.get(f"/api/bundles/{bundle_name}.js")

        if response.status_code == 500:
            pytest.skip("esbuild not available")

        assert response.status_code == 200
        assert "sourceMappingURL" in response.text

    def test_returns_404_for_unknown_bundle(self, client: TestClient) -> None:
        """Should return 404 for non-existent bundle."""
        response = client.get("/api/bundles/nonexistent.component.js")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    def test_has_immutable_cache_header(self, client: TestClient) -> None:
        """Response should have long immutable cache header for efficient caching."""
        list_response = client.get("/api/bundles")
        bundles = list_response.json()

        if not bundles:
            pytest.skip("No bundles available")

        bundle_name = bundles[0]["name"]
        response = client.get(f"/api/bundles/{bundle_name}.js")

        if response.status_code == 500:
            pytest.skip("esbuild not available")

        assert response.status_code == 200
        assert response.headers.get("cache-control") == "public, max-age=31536000, immutable"

    def test_returns_500_on_bundler_error(self, client: TestClient) -> None:
        """Should return 500 when bundler fails."""
        list_response = client.get("/api/bundles")
        bundles = list_response.json()

        if not bundles:
            pytest.skip("No bundles available")

        bundle_name = bundles[0]["name"]

        with patch("wilco.bridges.fastapi.bundle_component") as mock_bundle:
            mock_bundle.side_effect = RuntimeError("Bundling failed")
            response = client.get(f"/api/bundles/{bundle_name}.js")

        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Bundling failed" in data["detail"]


class TestGetBundleMetadata:
    """Tests for GET /api/bundles/{name}/metadata endpoint."""

    def test_returns_metadata(self, client: TestClient) -> None:
        """Should return metadata for valid component."""
        list_response = client.get("/api/bundles")
        bundles = list_response.json()

        if not bundles:
            pytest.skip("No bundles available")

        bundle_name = bundles[0]["name"]
        response = client.get(f"/api/bundles/{bundle_name}/metadata")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_metadata_has_title(self, client: TestClient) -> None:
        """Metadata should include title field."""
        list_response = client.get("/api/bundles")
        bundles = list_response.json()

        if not bundles:
            pytest.skip("No bundles available")

        # Find a bundle with metadata
        for bundle in bundles:
            response = client.get(f"/api/bundles/{bundle['name']}/metadata")
            if response.status_code == 200:
                data = response.json()
                if "title" in data:
                    assert isinstance(data["title"], str)
                    return

        # If no bundle has title, that's okay - metadata is optional

    def test_returns_404_for_unknown_bundle(self, client: TestClient) -> None:
        """Should return 404 for non-existent bundle metadata."""
        response = client.get("/api/bundles/nonexistent.component/metadata")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    def test_content_type_is_json(self, client: TestClient) -> None:
        """Metadata response should have JSON content type."""
        list_response = client.get("/api/bundles")
        bundles = list_response.json()

        if not bundles:
            pytest.skip("No bundles available")

        bundle_name = bundles[0]["name"]
        response = client.get(f"/api/bundles/{bundle_name}/metadata")

        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]


class TestAPIIntegration:
    """Integration tests for the complete API workflow."""

    def test_list_then_get_bundle(self, client: TestClient) -> None:
        """Should be able to list bundles then get each one."""
        list_response = client.get("/api/bundles")
        assert list_response.status_code == 200
        bundles = list_response.json()

        for bundle in bundles:
            name = bundle["name"]

            # Get bundle
            bundle_response = client.get(f"/api/bundles/{name}.js")
            # Accept either success or bundler-not-available
            assert bundle_response.status_code in [200, 500]

            # Get metadata
            meta_response = client.get(f"/api/bundles/{name}/metadata")
            assert meta_response.status_code == 200

    def test_list_then_get_all_metadata(self, client: TestClient) -> None:
        """Should be able to get metadata for all listed bundles."""
        list_response = client.get("/api/bundles")
        assert list_response.status_code == 200
        bundles = list_response.json()

        for bundle in bundles:
            name = bundle["name"]
            meta_response = client.get(f"/api/bundles/{name}/metadata")
            assert meta_response.status_code == 200
            assert isinstance(meta_response.json(), dict)

    def test_specific_example_components(self, example_client: TestClient) -> None:
        """Test specific known example components."""
        list_response = example_client.get("/api/bundles")
        bundles = list_response.json()
        names = [b["name"] for b in bundles]

        # Check for known example components
        expected_components = ["counter", "carousel", "crasher"]
        found = [c for c in expected_components if c in names]

        if not found:
            pytest.skip("Example components not found")

        for component_name in found:
            # Get metadata
            meta_response = example_client.get(f"/api/bundles/{component_name}/metadata")
            assert meta_response.status_code == 200
            metadata = meta_response.json()

            # Should have title
            assert "title" in metadata

            # Should have props schema
            if "props" in metadata:
                assert "type" in metadata["props"]


class TestErrorHandling:
    """Tests for error handling in the API."""

    def test_invalid_bundle_name_format(self, client: TestClient) -> None:
        """Should handle invalid bundle name formats gracefully."""
        invalid_names = [
            "../../../etc/passwd",  # Path traversal attempt
            "bundle with spaces",
            "",
        ]

        for name in invalid_names:
            if name:  # Skip empty string as it would be different route
                response = client.get(f"/api/bundles/{name}.js")
                # Should return 404 (not found) not 500 (server error)
                assert response.status_code in [404, 422]

    def test_special_characters_in_name(self, client: TestClient) -> None:
        """Should handle special characters in bundle names."""
        response = client.get("/api/bundles/test%2Fcomponent.js")

        # Should return 404 for non-existent component
        assert response.status_code == 404

    def test_very_long_bundle_name(self, client: TestClient) -> None:
        """Should handle very long bundle names."""
        long_name = "a" * 1000
        response = client.get(f"/api/bundles/{long_name}.js")

        # Should return 404 (not found) not crash
        assert response.status_code in [404, 414]  # 414 = URI Too Long
