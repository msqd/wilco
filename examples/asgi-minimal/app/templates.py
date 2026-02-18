"""Template rendering module for the minimal ASGI example.

Uses Jinja2 for template rendering.
"""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader

# Template directory
TEMPLATES_DIR = Path(__file__).parent.parent / "resources" / "templates"

# Jinja2 environment
_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=True,
)


def render_template(template_name: str, **context) -> str:
    """Render a Jinja2 template with the given context."""
    template = _env.get_template(template_name)
    return template.render(**context)
