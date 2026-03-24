"""Shared utilities for the Django bridge."""


def get_loader_script_tag() -> str:
    """Generate the wilco loader script tag with the correct mode.

    Uses the same resolution logic as the views layer: checks WILCO_BUILD_DIR
    env var first (empty string = disabled), then settings, then verifies
    the manifest exists on disk.

    Returns:
        HTML script tag string (without mark_safe wrapping).
    """
    import os
    from pathlib import Path

    from django.conf import settings
    from django.templatetags.static import static

    from wilco.manifest import load_manifest

    # Same precedence as _get_handlers() in views.py
    env_dir = os.environ.get("WILCO_BUILD_DIR")
    if env_dir is not None:
        build_path = Path(env_dir) if env_dir else None
    else:
        raw = getattr(settings, "WILCO_BUILD_DIR", None)
        build_path = Path(raw) if raw else None

    is_static = build_path is not None and load_manifest(build_path) is not None

    if is_static:
        manifest_url = static("wilco/manifest.json")
        return f'<script src="{static("wilco/loader.js")}" data-wilco-manifest="{manifest_url}" defer></script>'

    return f'<script src="{static("wilco/loader.js")}" defer></script>'
