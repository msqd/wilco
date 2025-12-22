"""Component registry for discovering and managing components."""

import json
from dataclasses import dataclass
from pathlib import Path


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

    Components are Python packages (directories with __init__.py) containing:
    - index.tsx (required): The component entry point
    - schema.json (optional): Props schema and metadata

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

    def add_source(self, path: Path, prefix: str = "") -> None:
        """Add a component source directory.

        Args:
            path: Path to the components directory.
            prefix: Optional prefix for component names (e.g., "myapp" -> "myapp:component").
        """
        self._sources.append((path, prefix))
        self._discover_from(path, prefix)

    def _discover_from(self, components_dir: Path, prefix: str) -> None:
        """Discover components from a specific directory.

        A valid component is a directory that:
        1. Contains __init__.py (is a Python package)
        2. Contains index.tsx or index.ts (has a TypeScript entry point)

        Args:
            components_dir: Directory to scan for components.
            prefix: Prefix to add to component names.
        """
        if not components_dir.exists():
            return

        # Find all __init__.py files (Python packages)
        for init_file in components_dir.rglob("__init__.py"):
            package_dir = init_file.parent

            # Skip the components directory itself if it has __init__.py
            if package_dir == components_dir:
                continue

            # Look for index.tsx or index.ts
            ts_file = package_dir / "index.tsx"
            if not ts_file.exists():
                ts_file = package_dir / "index.ts"
            if not ts_file.exists():
                continue

            # Component name is relative path from components dir
            rel_path = package_dir.relative_to(components_dir)
            base_name = str(rel_path).replace("/", ".").replace("\\", ".")

            # Add prefix if provided
            name = f"{prefix}:{base_name}" if prefix else base_name

            self.components[name] = Component(
                name=name,
                package_dir=package_dir,
                ts_path=ts_file,
            )

    def _discover(self) -> None:
        """Re-discover components from all sources."""
        for path, prefix in self._sources:
            self._discover_from(path, prefix)

    def get(self, name: str) -> Component | None:
        """Get a component by name."""
        return self.components.get(name)

    def refresh(self) -> None:
        """Re-discover components from all sources."""
        self.components.clear()
        self._discover()
