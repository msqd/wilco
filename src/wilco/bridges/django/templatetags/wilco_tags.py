"""Template tags for rendering wilco components.

Usage:
    {% load wilco_tags %}
    {% wilco_component "product_card" name=product.name price=product.price %}
"""

import json
import uuid
from typing import Any

from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.simple_tag
def wilco_component(
    component_name: str,
    api_base: str = "/api",
    **props: Any,
) -> str:
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
    props_json = json.dumps(props)

    html = f'''<div id="{container_id}"
     data-wilco-component="{component_name}"
     data-wilco-props='{props_json}'
     data-wilco-api="{api_base}">
</div>'''

    return mark_safe(html)


@register.simple_tag
def wilco_loader_script() -> str:
    """Include the wilco loader script.

    Call this once at the end of your template to load the wilco runtime.
    The loader will automatically initialize all wilco components on the page.

    Example:
        {% load wilco_tags %}
        <body>
            {% wilco_component "header" %}
            {% wilco_component "footer" %}
            {% wilco_loader_script %}
        </body>
    """
    return mark_safe('<script src="/static/wilco/loader.js" defer></script>')
