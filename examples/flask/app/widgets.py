"""Widgets for rendering wilco components in Flask/Jinja2 templates."""

import html
import json
import uuid
from typing import Any

from markupsafe import Markup


class WilcoComponentWidget:
    """Widget for rendering a wilco component in Jinja2 templates.

    This widget generates HTML that loads and renders a wilco component
    using the standalone loader. The loader fetches the component bundle
    from the API and renders it into the container.

    Usage in views:
        widget = WilcoComponentWidget("store:product", props={
            "name": "Test Product",
            "price": 29.99,
        })
        return render_template("page.html", widget=widget)

    Args:
        component_name: Name of the component to render (e.g., "store:product")
        props: Optional dictionary of props to pass to the component
        api_base: Base URL for the wilco API (default: "/api")
    """

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

    def render(self) -> str:
        """Render the widget as HTML.

        Returns:
            HTML string containing the component container and loader script.
        """
        # Escape props JSON for safe embedding in HTML attribute
        props_json = html.escape(json.dumps(self.props), quote=True)

        # Build data attributes
        data_attrs = [
            f'data-wilco-component="{self.component_name}"',
            f'data-wilco-props="{props_json}"',
            f'data-wilco-api="{self.api_base}"',
        ]

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

        return output

    def __str__(self) -> str:
        """Allow widget to be used directly in templates."""
        return self.render()

    def __html__(self) -> str:
        """Support Jinja2's safe rendering."""
        return self.render()

    def __call__(self) -> Markup:
        """Support calling the widget in templates."""
        return Markup(self.render())
