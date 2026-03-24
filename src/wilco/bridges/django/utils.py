"""Shared utilities for the Django bridge."""

import os
from pathlib import Path


def resolve_django_build_dir() -> Path | None:
    """Resolve the pre-built bundles directory for Django.

    Precedence:
    1. WILCO_BUILD_DIR env var (non-empty = use that path, empty = disabled)
    2. settings.WILCO_BUILD_DIR
    3. None if neither is set

    Returns:
        Path to the build directory, or None if disabled/unconfigured.
    """
    from django.conf import settings

    env_dir = os.environ.get("WILCO_BUILD_DIR")
    if env_dir is not None:
        return Path(env_dir) if env_dir else None

    raw = getattr(settings, "WILCO_BUILD_DIR", None)
    return Path(raw) if raw else None


def is_static_mode() -> bool:
    """Check if static mode is active (build dir exists with a manifest)."""
    from wilco.manifest import load_manifest

    build_path = resolve_django_build_dir()
    return build_path is not None and load_manifest(build_path) is not None


def get_loader_script_tag() -> str:
    """Generate the wilco loader script tag with the correct mode.

    In static mode (WILCO_BUILD_DIR with manifest), emits data-wilco-manifest
    so the loader fetches bundles from static files. Otherwise, API mode.

    Returns:
        HTML script tag string (without mark_safe wrapping).
    """
    from django.templatetags.static import static

    if is_static_mode():
        manifest_url = static("wilco/manifest.json")
        return f'<script src="{static("wilco/loader.js")}" data-wilco-manifest="{manifest_url}" defer></script>'

    return f'<script src="{static("wilco/loader.js")}" defer></script>'
