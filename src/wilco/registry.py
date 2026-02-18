"""Component registry for discovering and managing components."""

import json
import re
import warnings
from dataclasses import dataclass
from pathlib import Path

# Valid component names: alphanumerics, underscores, dots, colons
_VALID_NAME_RE = re.compile(r"^[a-zA-Z0-9_.:]+$")


def _load_metadata(package_dir: Path) -> dict:
    """Load component metadata from schema.json.

    The schema.json file is an extended JSON Schema that includes:
    - title: Human-readable component name
    - description: Component description
    - version: Semantic version
    - type, properties, required: Standard JSON Schema for props
    """
    schema_path = package_dir / "schema.json"
    if not schema_path.exists():
        return {}

    try:
        with open(schema_path) as f:
            schema = json.load(f)

        # Extract metadata fields and props schema
        return {
            "title": schema.get("title", ""),
            "description": schema.get("description", ""),
            "version": schema.get("version", ""),
            "props": {
                "type": schema.get("type", "object"),
                "properties": schema.get("properties", {}),
                "required": schema.get("required", []),
            },
        }
    except (json.JSONDecodeError, OSError):
        return {}


@dataclass
class Component:
    """A registered component."""

    name: str
    package_dir: Path
    ts_path: Path

    @property
    def metadata(self) -> dict:
        """Load metadata from schema.json on each access (for dev hot-reload)."""
        return _load_metadata(self.package_dir)


class ComponentRegistry:
    """Registry that discovers and manages components from multiple sources.

    Components are directories containing:
    - index.tsx or index.ts (required): The component entry point
    - schema.json (optional): Props schema and metadata
    - __init__.py (optional): Only needed if the component is used as a Python package

    Supports multiple component sources, each with an optional prefix:
    - Components from unprefixed sources are named by their path (e.g., "counter")
    - Components from prefixed sources include the prefix (e.g., "myapp:counter")

    Example:
        registry = ComponentRegistry()
        registry.add_source(Path("./components"))  # counter, button, etc.
        registry.add_source(Path("./myapp/components"), prefix="myapp")  # myapp:widget
    """

    def __init__(self, components_dir: Path | None = None, prefix: str = ""):
        """Initialize the registry.

        Args:
            components_dir: Optional initial components directory.
            prefix: Optional prefix for components from this directory.
        """
        self._sources: list[tuple[Path, str]] = []
        self.components: dict[str, Component] = {}

        if components_dir is not None:
            self.add_source(components_dir, prefix)

    @property
    def sources(self) -> list[tuple[Path, str]]:
        """Return a copy of the registered sources list."""
        return list(self._sources)

    def add_source(self, path: Path, prefix: str = "") -> None:
        """Add a component source directory.

        Args:
            path: Path to the components directory.
            prefix: Optional prefix for component names (e.g., "myapp" -> "myapp:component").
        """
        if not path.exists():
            warnings.warn(
                f"Component source path does not exist: {path}",
                stacklevel=2,
            )
            return
        if not path.is_dir():
            warnings.warn(
                f"Component source path is not a directory: {path}",
                stacklevel=2,
            )
            return

        self._sources.append((path, prefix))
        self._discover_from(path, prefix)

    def _discover_from(self, components_dir: Path, prefix: str) -> None:
        """Discover components from a specific directory.

        A valid component is a directory that contains index.tsx or index.ts.
        The __init__.py file is NOT required.

        Args:
            components_dir: Directory to scan for components.
            prefix: Prefix to add to component names.
        """
        if not components_dir.exists():
            return

        # Find all index.tsx and index.ts files
        seen_dirs: set[Path] = set()
        for pattern in ("**/index.tsx", "**/index.ts"):
            for ts_file in components_dir.glob(pattern):
                component_dir = ts_file.parent

                # Skip the components directory itself
                if component_dir == components_dir:
                    continue

                # Skip if we already found this directory (tsx takes precedence)
                # Use resolved paths to handle symlinks correctly
                resolved_dir = component_dir.resolve()
                if resolved_dir in seen_dirs:
                    continue
                seen_dirs.add(resolved_dir)

                # Prefer .tsx over .ts
                tsx_file = component_dir / "index.tsx"
                if tsx_file.exists():
                    ts_file = tsx_file

                # Component name is relative path from components dir
                rel_path = component_dir.relative_to(components_dir)
                base_name = str(rel_path).replace("/", ".").replace("\\", ".")

                # Add prefix if provided
                name = f"{prefix}:{base_name}" if prefix else base_name

                self.components[name] = Component(
                    name=name,
                    package_dir=component_dir,
                    ts_path=ts_file,
                )

    def _discover(self) -> None:
        """Re-discover components from all sources."""
        for path, prefix in self._sources:
            self._discover_from(path, prefix)

    def get(self, name: str) -> Component | None:
        """Get a component by name.

        Args:
            name: Component name (e.g., "counter" or "myapp:widget").

        Returns:
            The component if found, None otherwise.

        Raises:
            ValueError: If name is empty or contains invalid characters.
        """
        if not name or not isinstance(name, str):
            raise ValueError("Component name must be a non-empty string")
        if not _VALID_NAME_RE.match(name):
            raise ValueError(
                f"Component name contains invalid characters: {name!r}. "
                "Only alphanumerics, underscores, dots, and colons are allowed."
            )
        return self.components.get(name)

    def refresh(self) -> None:
        """Re-discover components from all sources."""
        self.components.clear()
        self._discover()
