"""Pre-compile component bundles for production deployment."""

import json
import shutil
from dataclasses import dataclass
from pathlib import Path

from .bundler import bundle_component
from .registry import ComponentRegistry


@dataclass(frozen=True)
class BuildResult:
    """Result of a build operation."""

    component_count: int
    output_dir: Path


def _sanitize_filename(name: str) -> str:
    """Sanitize a component name for use as a filename.

    Replaces colons with double dashes to ensure cross-platform compatibility.
    """
    return name.replace(":", "--")


def build_components(
    registry: ComponentRegistry,
    output_dir: Path,
    *,
    minify: bool = True,
    sourcemap: bool = False,
) -> BuildResult:
    """Pre-compile all registered components to static JS files.

    Args:
        registry: Component registry with discovered components.
        output_dir: Directory to write pre-built bundles and manifest.
        minify: Whether to minify output (default: True).
        sourcemap: Whether to include source maps (default: False).

    Returns:
        BuildResult with component count and output path.
    """
    # Clean and create output directory
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict[str, str]] = {}

    for name, component in registry.components.items():
        result = bundle_component(
            component.ts_path,
            component_name=name,
            minify=minify,
            sourcemap=sourcemap,
        )

        safe_name = _sanitize_filename(name)
        filename = f"{safe_name}.{result.hash}.js"

        (output_dir / filename).write_text(result.code)

        manifest[name] = {
            "file": filename,
            "hash": result.hash,
        }

    # Write manifest
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

    return BuildResult(
        component_count=len(manifest),
        output_dir=output_dir,
    )
