"""Manifest reader for pre-built component bundles."""

import json
from pathlib import Path


class Manifest:
    """Reads and provides access to pre-built component bundles.

    The manifest.json file maps component names to their pre-built
    JavaScript files with content hashes for cache busting.
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

    def get_bundle(self, name: str) -> tuple[str, str] | None:
        """Get the pre-built bundle code and hash for a component.

        Returns:
            Tuple of (code, hash) or None if component not in manifest.
        """
        entry = self._data.get(name)
        if entry is None:
            return None

        file_path = self._build_dir / entry["file"]
        code = file_path.read_text()
        return code, entry["hash"]

    def has(self, name: str) -> bool:
        """Check if a component exists in the manifest."""
        return name in self._data

    @property
    def components(self) -> list[str]:
        """List of component names in the manifest."""
        return list(self._data.keys())


def load_manifest(build_dir: Path) -> Manifest | None:
    """Load a manifest from a directory, returning None if not found.

    This is a convenience function for bridges that need to optionally
    load pre-built bundles.
    """
    if not build_dir.exists():
        return None

    manifest_path = build_dir / "manifest.json"
    if not manifest_path.exists():
        return None

    return Manifest(build_dir)
