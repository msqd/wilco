"""Widgets for rendering wilco components in Django templates and admin."""

import html
import json
import uuid
from typing import Any

from django.utils.safestring import SafeString, mark_safe


class WilcoComponentWidget:
    """Widget for rendering a wilco component in Django templates or admin.

    This widget generates HTML that loads and renders a wilco component
    using the standalone loader. The loader fetches the component bundle
    from the API and renders it into the container.

    Usage in admin:
        @admin.register(Product)
        class ProductAdmin(ModelAdmin):
            readonly_fields = ["preview"]

            def preview(self, obj):
                return WilcoComponentWidget("product_card", props={
                    "name": obj.name,
                    "price": str(obj.price),
                    "image": obj.image_url,
                }).render()

    For live preview mode (updates on form field changes):
        return WilcoComponentWidget("product_card",
            props={...},
            live=True,
            validate_url="/admin/store/product/123/validate_preview/",
        ).render()

    Args:
        component_name: Name of the component to render (e.g., "product_card")
        props: Optional dictionary of props to pass to the component
        api_base: Base URL for the wilco API (default: "/api")
        live: Enable live preview mode (updates on form field blur)
        validate_url: URL for validation endpoint (required if live=True)
    """

    # Track if loader script has been included on the page
    _loader_included = False

    def __init__(
        self,
        component_name: str,
        props: dict[str, Any] | None = None,
        api_base: str = "/api",
        live: bool = False,
        validate_url: str | None = None,
    ):
        self.component_name = component_name
        self.props = props or {}
        self.api_base = api_base
        self.live = live
        self.validate_url = validate_url
        self.container_id = f"wilco-{uuid.uuid4().hex[:8]}"

    def _get_bundle_hash(self) -> str | None:
        """Get the bundle hash for cache busting.

        Returns:
            Bundle hash string, or None if not available.
        """
        # Import lazily to avoid circular imports
        from .views import get_bundle_result

        result = get_bundle_result(self.component_name)
        return result.hash if result else None

    def render(self) -> SafeString:
        """Render the widget as HTML.

        Returns:
            Safe HTML string containing the component container and loader script.
        """
        # Escape props JSON for safe embedding in HTML attribute
        # Use html.escape to handle quotes and special characters
        props_json = html.escape(json.dumps(self.props), quote=True)

        # Get bundle hash for cache busting
        bundle_hash = self._get_bundle_hash()

        # Build data attributes
        data_attrs = [
            f'data-wilco-component="{self.component_name}"',
            f'data-wilco-props="{props_json}"',
            f'data-wilco-api="{self.api_base}"',
        ]

        if bundle_hash:
            data_attrs.append(f'data-wilco-hash="{bundle_hash}"')

        if self.live:
            data_attrs.append('data-wilco-live="true"')
            if self.validate_url:
                data_attrs.append(f'data-wilco-validate-url="{self.validate_url}"')

        data_attrs_str = "\n     ".join(data_attrs)

        # Container for the component
        output = f"""<div id="{self.container_id}"
     {data_attrs_str}
     style="min-height: 50px;">
    <div style="color: #666; padding: 1rem; text-align: center;">
        Loading component...
    </div>
</div>"""

        # Include the loader script (only once per page render)
        # Note: In Django admin, each readonly field is rendered independently,
        # so we include the script with each widget. The browser will only
        # load it once due to caching.
        output += """
<script src="/static/wilco/loader.js" defer></script>"""

        # Include live loader script if in live mode
        if self.live:
            output += """
<script src="/static/wilco/live-loader.js" defer></script>"""

        return mark_safe(output)

    def __str__(self) -> str:
        """Allow widget to be used directly in templates."""
        return self.render()

    def __html__(self) -> str:
        """Support Django's mark_safe protocol."""
        return self.render()
