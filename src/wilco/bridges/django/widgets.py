"""Widgets for rendering wilco components in Django templates and admin."""

import json
import uuid
from typing import Any

from django.utils.safestring import mark_safe


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

    Args:
        component_name: Name of the component to render (e.g., "product_card")
        props: Optional dictionary of props to pass to the component
        api_base: Base URL for the wilco API (default: "/api")
    """

    # Track if loader script has been included on the page
    _loader_included = False

    def __init__(
        self,
        component_name: str,
        props: dict[str, Any] | None = None,
        api_base: str = "/api",
    ):
        self.component_name = component_name
        self.props = props or {}
        self.api_base = api_base
        self.container_id = f"wilco-{uuid.uuid4().hex[:8]}"

    def render(self) -> str:
        """Render the widget as HTML.

        Returns:
            Safe HTML string containing the component container and loader script.
        """
        props_json = json.dumps(self.props)

        # Container for the component
        html = f'''<div id="{self.container_id}"
     data-wilco-component="{self.component_name}"
     data-wilco-props='{props_json}'
     data-wilco-api="{self.api_base}"
     style="min-height: 50px;">
    <div style="color: #666; padding: 1rem; text-align: center;">
        Loading component...
    </div>
</div>'''

        # Include the loader script (only once per page render)
        # Note: In Django admin, each readonly field is rendered independently,
        # so we include the script with each widget. The browser will only
        # load it once due to caching.
        html += '''
<script src="/static/wilco/loader.js" defer></script>'''

        return mark_safe(html)

    def __str__(self) -> str:
        """Allow widget to be used directly in templates."""
        return self.render()

    def __html__(self) -> str:
        """Support Django's mark_safe protocol."""
        return self.render()
