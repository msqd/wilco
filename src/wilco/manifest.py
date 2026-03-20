"""Manifest reader for pre-built component bundles."""

import json
import os
from pathlib import Path

from .bundler import BundleResult


class Manifest:
    """Reads and provides access to pre-built component bundles.

    The manifest.json file maps component names to their pre-built
    JavaScript files with content hashes for cache busting.

    Bundle file contents are cached in memory after first read since
    pre-built files are immutable between deployments.
    """

    def __init__(self, build_dir: Path) -> None:
        manifest_path = build_dir / "manifest.json"
        if not manifest_path.exists():
            raise FileNotFoundError(f"Manifest not found: {manifest_path}")

        try:
            self._data: dict[str, dict[str, str]] = json.loads(manifest_path.read_text())
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid manifest JSON: {e}") from e

        self._build_dir = build_dir
        self._bundle_cache: dict[str, BundleResult] = {}

    def get_bundle(self, name: str) -> BundleResult | None:
        """Get the pre-built bundle as a BundleResult.

        File contents are cached after first read.

        Returns:
            BundleResult or None if component not in manifest.
        """
        cached = self._bundle_cache.get(name)
        if cached is not None:
            return cached

        entry = self._data.get(name)
        if entry is None:
            return None

        file_path = self._build_dir / entry["file"]
        code = file_path.read_text()
        result = BundleResult(code=code, hash=entry["hash"])
        self._bundle_cache[name] = result
        return result

    def get_hash(self, name: str) -> str | None:
        """Get the content hash for a component without reading the bundle file."""
        entry = self._data.get(name)
        return entry["hash"] if entry else None

    def has(self, name: str) -> bool:
        """Check if a component exists in the manifest."""
        return name in self._data

    @property
    def components(self) -> list[str]:
        """List of component names in the manifest."""
        return list(self._data.keys())


def load_manifest(build_dir: Path) -> Manifest | None:
    """Load a manifest from a directory, returning None if not found."""
    try:
        return Manifest(build_dir)
    except (FileNotFoundError, ValueError):
        return None


def resolve_build_dir(default_path: Path) -> Path | None:
    """Resolve the pre-built bundles directory from env var or default path.

    Checks WILCO_BUILD_DIR env var first, then falls back to default_path
    if it contains a manifest.json.

    Args:
        default_path: Default directory to check (e.g., BASE_DIR / "dist" / "wilco").

    Returns:
        Path to the build directory, or None if no pre-built bundles found.
    """
    env_dir = os.environ.get("WILCO_BUILD_DIR")
    if env_dir:
        return Path(env_dir)

    if (default_path / "manifest.json").exists():
        return default_path

    return None
