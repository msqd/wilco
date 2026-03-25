"""Template tags for rendering wilco components.

Usage:
    {% load wilco_tags %}
    {% wilco_component "product_card" name=product.name price=product.price %}
"""

import html as html_module
import json
import uuid
from typing import Any

from django import template
from django.utils.safestring import SafeString, mark_safe

register = template.Library()


@register.simple_tag
def wilco_component(
    component_name: str,
    api_base: str = "/api",
    **props: Any,
) -> SafeString:
    """Render a wilco component.

    Args:
        component_name: Name of the component to render
        api_base: Base URL for the wilco API (default: "/api")
        **props: Props to pass to the component

    Returns:
        Safe HTML string containing the component container.

    Example:
        {% wilco_component "product_card" name="Widget" price="9.99" %}
        {% wilco_component "chart" api_base="/custom-api" data=chart_data %}
    """
    container_id = f"wilco-{uuid.uuid4().hex[:8]}"
    props_json = html_module.escape(json.dumps(props), quote=True)
    safe_name = html_module.escape(str(component_name), quote=True)
    safe_api = html_module.escape(str(api_base), quote=True)

    result = f"""<div id="{container_id}"
     data-wilco-component="{safe_name}"
     data-wilco-props="{props_json}"
     data-wilco-api="{safe_api}">
</div>"""

    return mark_safe(result)


@register.simple_tag
def wilco_loader_script() -> SafeString:
    """Include the wilco loader script.

    Call this once at the end of your template to load the wilco runtime.
    The loader will automatically initialize all wilco components on the page.

    When WILCO_BUILD_DIR is configured and contains a manifest, the loader
    is configured in static mode: bundles are loaded directly from static files
    instead of the API. Otherwise, the loader uses API mode.

    Example:
        {% load wilco_tags %}
        <body>
            {% wilco_component "header" %}
            {% wilco_component "footer" %}
            {% wilco_loader_script %}
        </body>
    """
    from ..utils import get_loader_script_tag

    return mark_safe(get_loader_script_tag())
