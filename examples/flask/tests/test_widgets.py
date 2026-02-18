"""Tests for the WilcoComponentWidget live mode support."""

from app.widgets import WilcoComponentWidget


class TestWilcoComponentWidgetLiveMode:
    """Tests for live preview data attributes on the widget."""

    def test_default_widget_has_no_live_attributes(self):
        widget = WilcoComponentWidget("store:product", props={"name": "Test"})
        html = widget.render()

        assert "data-wilco-live" not in html
        assert "data-wilco-validate-url" not in html

    def test_live_mode_adds_data_attribute(self):
        widget = WilcoComponentWidget(
            "store:product",
            props={"name": "Test"},
            live=True,
            validate_url="/admin/product/preview",
        )
        html = widget.render()

        assert 'data-wilco-live="true"' in html
        assert 'data-wilco-validate-url="/admin/product/preview"' in html

    def test_live_mode_without_validate_url_omits_url_attribute(self):
        widget = WilcoComponentWidget(
            "store:product",
            props={"name": "Test"},
            live=True,
        )
        html = widget.render()

        assert 'data-wilco-live="true"' in html
        assert "data-wilco-validate-url" not in html
