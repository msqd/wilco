"""Tests for the Starlette example application."""

import pytest
from starlette.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def test_homepage(client):
    """Test that the homepage loads."""
    response = client.get("/")
    assert response.status_code == 200
    assert "Wilco Shop" in response.text


def test_api_bundles(client):
    """Test that the API bundles endpoint works."""
    response = client.get("/api/bundles")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_product_detail_not_found(client):
    """Test 404 for non-existent product."""
    response = client.get("/product/99999")
    assert response.status_code == 404
