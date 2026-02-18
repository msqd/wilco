"""Flask bridge for serving wilco components.

Requires: pip install wilco[flask]

Example:
    ```python
    from flask import Flask
    from wilco import ComponentRegistry
    from wilco.bridges.flask import create_blueprint

    app = Flask(__name__)
    registry = ComponentRegistry(Path("./components"))
    app.register_blueprint(create_blueprint(registry), url_prefix="/api")
    ```
"""

import importlib.util

if importlib.util.find_spec("flask") is None:
    raise ImportError("Flask is required for the Flask bridge. Install it with: pip install wilco[flask]")

from flask import Blueprint, Response, jsonify

from wilco import ComponentRegistry
from wilco.bridges.base import CACHE_CONTROL_IMMUTABLE, BridgeHandlers


def create_blueprint(registry: ComponentRegistry) -> Blueprint:
    """Create a Flask Blueprint with component serving endpoints.

    Args:
        registry: The component registry to serve components from.

    Returns:
        A Flask Blueprint that can be registered on any app.

    Example:
        ```python
        from flask import Flask
        from wilco import ComponentRegistry
        from wilco.bridges.flask import create_blueprint

        app = Flask(__name__)
        registry = ComponentRegistry(Path("./components"))
        app.register_blueprint(create_blueprint(registry), url_prefix="/api")
        ```
    """
    handlers = BridgeHandlers(registry)
    bp = Blueprint("wilco", __name__)

    @bp.route("/bundles")
    def list_bundles():
        """List all available bundles."""
        bundles = handlers.list_bundles()
        return jsonify(bundles)

    @bp.route("/bundles/<name>.js")
    def get_bundle(name: str):
        """Get the bundled JavaScript for a component."""
        try:
            result = handlers.get_bundle(name)
        except ValueError:
            return jsonify({"detail": f"Invalid component name: '{name}'"}), 422

        if result is None:
            return jsonify({"detail": f"Bundle '{name}' not found"}), 404

        response = Response(result.code, mimetype="application/javascript")
        response.headers["Cache-Control"] = CACHE_CONTROL_IMMUTABLE
        return response

    @bp.route("/bundles/<name>/metadata")
    def get_metadata(name: str):
        """Get metadata for a component."""
        try:
            metadata = handlers.get_metadata(name)
        except ValueError:
            return jsonify({"detail": f"Invalid component name: '{name}'"}), 422

        if metadata is None:
            return jsonify({"detail": f"Bundle '{name}' not found"}), 404

        return jsonify(metadata)

    return bp


__all__ = ["create_blueprint"]
