"""Tests for the Flask admin live preview endpoint."""


class TestGetPreviewProps:
    """Tests for get_preview_props function."""

    def test_converts_form_data_to_props(self):
        from app.admin import get_preview_props

        form_data = {
            "name": "Widget",
            "price": "19.99",
            "description": "A nice widget",
            "image": "products/widget.jpg",
        }
        props = get_preview_props(form_data)

        assert props["name"] == "Widget"
        assert props["price"] == 19.99
        assert props["description"] == "A nice widget"
        assert props["imageUrl"] == "/media/products/widget.jpg"

    def test_handles_missing_image_with_placeholder(self):
        from app.admin import get_preview_props

        form_data = {"name": "Widget", "price": "10", "description": ""}
        props = get_preview_props(form_data)

        assert "picsum.photos" in props["imageUrl"]

    def test_falls_back_to_product_image_when_no_form_image(self, app, sample_product):
        from app.admin import get_preview_props

        with app.app_context():
            form_data = {"name": "Updated", "price": "5"}
            props = get_preview_props(form_data, product=sample_product)

            assert props["imageUrl"] == "/media/products/test.jpg"

    def test_handles_invalid_price_as_zero(self):
        from app.admin import get_preview_props

        form_data = {"name": "Widget", "price": "not-a-number"}
        props = get_preview_props(form_data)

        assert props["price"] == 0

    def test_handles_empty_price_as_zero(self):
        from app.admin import get_preview_props

        form_data = {"name": "Widget", "price": ""}
        props = get_preview_props(form_data)

        assert props["price"] == 0

    def test_handles_comma_decimal_separator(self):
        from app.admin import get_preview_props

        form_data = {"name": "Widget", "price": "19,99"}
        props = get_preview_props(form_data)

        assert props["price"] == 19.99


class TestValidatePreviewEndpoint:
    """Tests for the /admin/product/preview POST endpoint."""

    def test_valid_data_returns_success_with_props(self, client):
        response = client.post(
            "/admin/product/preview",
            data={"name": "Test", "price": "9.99", "description": "desc"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["props"]["name"] == "Test"
        assert data["props"]["price"] == 9.99

    def test_missing_name_returns_error(self, client):
        response = client.post(
            "/admin/product/preview",
            data={"price": "9.99"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is False
        assert "name" in data["errors"]

    def test_missing_price_returns_error(self, client):
        response = client.post(
            "/admin/product/preview",
            data={"name": "Test"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is False
        assert "price" in data["errors"]

    def test_invalid_price_returns_error(self, client):
        response = client.post(
            "/admin/product/preview",
            data={"name": "Test", "price": "abc"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is False
        assert "price" in data["errors"]

    def test_edit_preview_uses_existing_product_image(self, client, sample_product):
        response = client.post(
            "/admin/product/1/preview",
            data={"name": "Updated Name", "price": "15.00"},
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["props"]["imageUrl"] == "/media/products/test.jpg"

    def test_get_method_not_allowed(self, client):
        response = client.get("/admin/product/preview")
        assert response.status_code == 405


class TestAdminScriptInjection:
    """Tests for the after_request script injection."""

    def test_admin_pages_include_preview_scripts(self, client):
        response = client.get("/admin/")

        html = response.data.decode()
        assert "admin-preview-inject.js" in html
        assert "live-loader-flask.js" in html
        assert "loader.js" in html

    def test_non_admin_pages_do_not_include_preview_scripts(self, client, sample_product):
        response = client.get("/")

        html = response.data.decode()
        assert "admin-preview-inject.js" not in html
