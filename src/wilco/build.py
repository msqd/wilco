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
    # Clean and create output directory (safety: only delete if it looks like a previous build)
    if output_dir.exists():
        if not (output_dir / "manifest.json").exists() and any(output_dir.iterdir()):
            raise ValueError(
                f"Refusing to delete {output_dir}: directory exists but contains no "
                f"manifest.json. Use an empty directory or a previous build output."
            )
        shutil.rmtree(output_dir)
    bundles_dir = output_dir / "bundles"
    bundles_dir.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, dict[str, str]] = {}
    errors: list[tuple[str, str]] = []

    for name, component in registry.components.items():
        try:
            result = bundle_component(
                component.ts_path,
                component_name=name,
                minify=minify,
                sourcemap=sourcemap,
            )
        except Exception as e:
            errors.append((name, str(e)))
            continue

        safe_name = _sanitize_filename(name)
        filename = f"{safe_name}.{result.hash}.js"

        (bundles_dir / filename).write_text(result.code)

        manifest[name] = {
            "file": f"bundles/{filename}",
            "hash": result.hash,
        }

    # Write manifest for all successful components
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

    if errors:
        error_summary = "; ".join(f"{name}: {msg}" for name, msg in errors)
        raise RuntimeError(
            f"Failed to build {len(errors)} component(s): {error_summary}. "
            f"{len(manifest)} component(s) built successfully."
        )

    return BuildResult(
        component_count=len(manifest),
        output_dir=output_dir,
    )
