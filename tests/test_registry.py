"""Unit tests for wilco.registry module."""

import json
from pathlib import Path

import pytest

from wilco.registry import Component, ComponentRegistry
from conftest import create_component_package


class TestComponent:
    """Tests for Component dataclass."""

    def test_create_component_with_required_fields(self, temp_dir: Path) -> None:
        """Should create component with required fields."""
        package_dir = temp_dir / "test"
        ts_path = package_dir / "index.tsx"

        component = Component(
            name="test.component",
            package_dir=package_dir,
            ts_path=ts_path,
        )

        assert component.name == "test.component"
        assert component.package_dir == package_dir
        assert component.ts_path == ts_path
        assert component.metadata == {}  # Default empty dict

    def test_metadata_loads_from_schema_json(self, temp_dir: Path) -> None:
        """Should load metadata from schema.json file."""
        package_dir = temp_dir / "test"
        package_dir.mkdir(parents=True)
        ts_path = package_dir / "index.tsx"

        # Create schema.json with metadata
        schema = {
            "title": "Test",
            "description": "A test component",
            "version": "1.0.0",
            "type": "object",
            "properties": {"count": {"type": "number"}},
            "required": ["count"],
        }
        (package_dir / "schema.json").write_text(json.dumps(schema))

        component = Component(
            name="test.component",
            package_dir=package_dir,
            ts_path=ts_path,
        )

        assert component.metadata["title"] == "Test"
        assert component.metadata["description"] == "A test component"
        assert component.metadata["version"] == "1.0.0"
        assert component.metadata["props"]["properties"]["count"]["type"] == "number"


class TestComponentRegistryInit:
    """Tests for ComponentRegistry initialization."""

    def test_creates_empty_registry_for_nonexistent_dir(self, temp_dir: Path) -> None:
        """Should create empty registry when components dir doesn't exist."""
        nonexistent = temp_dir / "nonexistent"
        registry = ComponentRegistry(nonexistent)

        assert len(registry.components) == 0

    def test_discovers_components_on_init(self, sample_component_dir: Path) -> None:
        """Should auto-discover components during initialization."""
        registry = ComponentRegistry(sample_component_dir)

        assert len(registry.components) > 0

    def test_stores_source_in_sources_list(self, sample_component_dir: Path) -> None:
        """Should store the component source in the sources list."""
        registry = ComponentRegistry(sample_component_dir)

        assert len(registry._sources) == 1
        assert registry._sources[0] == (sample_component_dir, "")


class TestComponentDiscovery:
    """Tests for component discovery logic."""

    def test_discovers_package_components(self, sample_component_dir: Path) -> None:
        """Should discover component packages with __init__.py and index.tsx."""
        registry = ComponentRegistry(sample_component_dir)

        # Should find widgets.counter (has __init__.py and index.tsx)
        assert "widgets.counter" in registry.components

    def test_requires_init_py(self, temp_dir: Path) -> None:
        """Should skip directories without __init__.py."""
        category = temp_dir / "widgets"
        pkg_dir = category / "nopackage"
        pkg_dir.mkdir(parents=True)

        # Create index.tsx but no __init__.py
        (pkg_dir / "index.tsx").write_text("export default function() {}")

        registry = ComponentRegistry(temp_dir)

        assert "widgets.nopackage" not in registry.components

    def test_requires_index_tsx(self, temp_dir: Path) -> None:
        """Should skip packages without index.tsx or index.ts."""
        category = temp_dir / "widgets"
        pkg_dir = category / "noindex"
        pkg_dir.mkdir(parents=True)

        # Create __init__.py but no index.tsx
        (pkg_dir / "__init__.py").write_text("")
        (pkg_dir / "component.tsx").write_text("export default function() {}")

        registry = ComponentRegistry(temp_dir)

        assert "widgets.noindex" not in registry.components

    def test_prefers_tsx_over_ts(self, temp_dir: Path) -> None:
        """Should prefer index.tsx over index.ts when both exist."""
        category = temp_dir / "widgets"
        pkg_dir = category / "both"
        pkg_dir.mkdir(parents=True)

        (pkg_dir / "__init__.py").write_text("")
        (pkg_dir / "index.tsx").write_text("// TSX file")
        (pkg_dir / "index.ts").write_text("// TS file")

        registry = ComponentRegistry(temp_dir)

        component = registry.get("widgets.both")
        assert component is not None
        assert component.ts_path.suffix == ".tsx"

    def test_falls_back_to_ts(self, temp_dir: Path) -> None:
        """Should use index.ts when no index.tsx exists."""
        category = temp_dir / "widgets"
        pkg_dir = category / "tsonly"
        pkg_dir.mkdir(parents=True)

        (pkg_dir / "__init__.py").write_text("")
        (pkg_dir / "index.ts").write_text("// TS file")

        registry = ComponentRegistry(temp_dir)

        component = registry.get("widgets.tsonly")
        assert component is not None
        assert component.ts_path.suffix == ".ts"

    def test_generates_dotted_names_from_path(self, temp_dir: Path) -> None:
        """Should generate component names with dots from directory structure."""
        nested = temp_dir / "category" / "subcategory" / "deep"
        nested.mkdir(parents=True)

        (nested / "__init__.py").write_text("")
        (nested / "index.tsx").write_text("export default function() {}")

        registry = ComponentRegistry(temp_dir)

        assert "category.subcategory.deep" in registry.components

    def test_discovers_multiple_components(self, temp_dir: Path) -> None:
        """Should discover all valid components in directory tree."""
        # Create multiple components
        for i in range(3):
            cat = temp_dir / f"cat{i}"
            create_component_package(
                cat, "comp", "export default function() {}"
            )

        registry = ComponentRegistry(temp_dir)

        assert len(registry.components) == 3
        assert "cat0.comp" in registry.components
        assert "cat1.comp" in registry.components
        assert "cat2.comp" in registry.components

    def test_skips_components_dir_itself(self, temp_dir: Path) -> None:
        """Should not register the components directory itself as a component."""
        # Add __init__.py to root (making it a package)
        (temp_dir / "__init__.py").write_text("")
        # But don't add index.tsx to root

        # Add a valid component
        create_component_package(
            temp_dir / "widgets", "counter", "export default function() {}"
        )

        registry = ComponentRegistry(temp_dir)

        # Should find widgets.counter but not the root
        assert "widgets.counter" in registry.components
        assert "" not in registry.components


class TestMetadataLoading:
    """Tests for metadata loading from schema.json files."""

    def test_loads_schema_json(self, sample_component_dir: Path) -> None:
        """Should load metadata from schema.json file."""
        registry = ComponentRegistry(sample_component_dir)

        component = registry.get("widgets.counter")
        assert component is not None
        assert component.metadata.get("title") == "Test Counter"
        assert component.metadata.get("description") == "A test counter component"

    def test_extracts_props_schema(self, sample_component_dir: Path) -> None:
        """Should extract props schema from schema.json."""
        registry = ComponentRegistry(sample_component_dir)

        component = registry.get("widgets.counter")
        assert component is not None
        props = component.metadata.get("props", {})
        assert props.get("type") == "object"
        assert "initialValue" in props.get("properties", {})

    def test_returns_empty_dict_when_no_schema(
        self, sample_component_dir: Path
    ) -> None:
        """Should return empty metadata when no schema.json exists."""
        registry = ComponentRegistry(sample_component_dir)

        # The 'simple' component has no schema.json
        component = registry.get("widgets.simple")
        assert component is not None
        assert component.metadata == {}

    def test_returns_empty_dict_on_invalid_json(self, temp_dir: Path) -> None:
        """Should return empty metadata when schema.json is invalid."""
        category = temp_dir / "widgets"
        pkg_dir = category / "broken"
        pkg_dir.mkdir(parents=True)

        (pkg_dir / "__init__.py").write_text("")
        (pkg_dir / "index.tsx").write_text("export default function() {}")
        (pkg_dir / "schema.json").write_text("{ invalid json }")

        registry = ComponentRegistry(temp_dir)

        component = registry.get("widgets.broken")
        assert component is not None
        assert component.metadata == {}

    def test_extracts_version_from_schema(self, temp_dir: Path) -> None:
        """Should extract version field from schema.json."""
        create_component_package(
            temp_dir / "widgets",
            "versioned",
            "export default function() {}",
            schema={"title": "Versioned", "version": "2.0.0", "type": "object"},
        )

        registry = ComponentRegistry(temp_dir)

        component = registry.get("widgets.versioned")
        assert component is not None
        assert component.metadata.get("version") == "2.0.0"


class TestComponentRegistryGet:
    """Tests for ComponentRegistry.get method."""

    def test_returns_component_by_name(self, sample_registry: ComponentRegistry) -> None:
        """Should return component when name exists."""
        component = sample_registry.get("widgets.counter")

        assert component is not None
        assert component.name == "widgets.counter"

    def test_returns_none_for_unknown_name(
        self, sample_registry: ComponentRegistry
    ) -> None:
        """Should return None when component name not found."""
        component = sample_registry.get("nonexistent.component")

        assert component is None

    def test_returns_none_for_empty_name(
        self, sample_registry: ComponentRegistry
    ) -> None:
        """Should return None for empty string name."""
        component = sample_registry.get("")

        assert component is None


class TestComponentRegistryRefresh:
    """Tests for ComponentRegistry.refresh method."""

    def test_clears_and_rediscovers_components(self, temp_dir: Path) -> None:
        """Should clear existing components and rediscover."""
        category = temp_dir / "widgets"
        create_component_package(
            category, "initial", "export default function() {}"
        )

        registry = ComponentRegistry(temp_dir)
        assert "widgets.initial" in registry.components

        # Add new component
        create_component_package(
            category, "added", "export default function() {}"
        )

        # Refresh
        registry.refresh()

        assert "widgets.initial" in registry.components
        assert "widgets.added" in registry.components

    def test_removes_deleted_components(self, temp_dir: Path) -> None:
        """Should remove components that no longer exist."""
        category = temp_dir / "widgets"
        pkg_dir = create_component_package(
            category, "temporary", "export default function() {}"
        )

        registry = ComponentRegistry(temp_dir)
        assert "widgets.temporary" in registry.components

        # Delete the package
        import shutil

        shutil.rmtree(pkg_dir)

        # Refresh
        registry.refresh()

        assert "widgets.temporary" not in registry.components

    def test_updates_metadata_on_refresh(self, temp_dir: Path) -> None:
        """Should load updated metadata on refresh."""
        category = temp_dir / "widgets"
        pkg_dir = create_component_package(
            category,
            "changing",
            "export default function() {}",
            schema={"title": "Original"},
        )

        registry = ComponentRegistry(temp_dir)
        assert registry.get("widgets.changing").metadata.get("title") == "Original"

        # Update schema
        (pkg_dir / "schema.json").write_text(json.dumps({"title": "Updated"}))

        # Refresh
        registry.refresh()

        assert registry.get("widgets.changing").metadata.get("title") == "Updated"


class TestComponentRegistryIntegration:
    """Integration tests for ComponentRegistry."""

    def test_works_with_real_components(self) -> None:
        """Test registry with actual wilco examples."""
        # Use the real examples directory
        components_dir = Path(__file__).parent.parent / "src" / "wilco" / "examples"

        if not components_dir.exists():
            pytest.skip("Components directory not found")

        registry = ComponentRegistry(components_dir)

        # Should have example components
        assert len(registry.components) > 0

        # Check specific known components
        counter = registry.get("counter")
        if counter:
            assert counter.metadata.get("title") is not None
            assert counter.ts_path.exists()

    def test_component_paths_are_absolute(
        self, sample_registry: ComponentRegistry
    ) -> None:
        """Component paths should be absolute paths."""
        for component in sample_registry.components.values():
            assert component.package_dir.is_absolute()
            assert component.ts_path.is_absolute()

    def test_component_files_exist(self, sample_registry: ComponentRegistry) -> None:
        """All registered component files should exist."""
        for component in sample_registry.components.values():
            assert component.package_dir.exists(), f"{component.package_dir} does not exist"
            assert component.ts_path.exists(), f"{component.ts_path} does not exist"


class TestMultiSourceRegistry:
    """Tests for multi-source registry with prefixes."""

    def test_add_source_adds_to_sources_list(self, temp_dir: Path) -> None:
        """Should add source to internal sources list."""
        registry = ComponentRegistry()
        registry.add_source(temp_dir, prefix="myapp")

        assert len(registry._sources) == 1
        assert registry._sources[0] == (temp_dir, "myapp")

    def test_add_source_discovers_components(self, temp_dir: Path) -> None:
        """Should discover components from added source."""
        create_component_package(
            temp_dir / "widgets", "button", "export default function() {}"
        )

        registry = ComponentRegistry()
        registry.add_source(temp_dir)

        assert "widgets.button" in registry.components

    def test_prefix_applied_to_component_names(self, temp_dir: Path) -> None:
        """Should prefix component names when prefix is provided."""
        create_component_package(
            temp_dir / "widgets", "button", "export default function() {}"
        )

        registry = ComponentRegistry()
        registry.add_source(temp_dir, prefix="store")

        assert "store:widgets.button" in registry.components
        assert "widgets.button" not in registry.components

    def test_multiple_sources_with_different_prefixes(self, temp_dir: Path) -> None:
        """Should support multiple sources with different prefixes."""
        # Create two separate source directories
        source1 = temp_dir / "source1"
        source2 = temp_dir / "source2"
        source1.mkdir()
        source2.mkdir()

        create_component_package(source1, "widget", "export default function() {}")
        create_component_package(source2, "widget", "export default function() {}")

        registry = ComponentRegistry()
        registry.add_source(source1, prefix="app1")
        registry.add_source(source2, prefix="app2")

        assert len(registry._sources) == 2
        assert "app1:widget" in registry.components
        assert "app2:widget" in registry.components

    def test_unprefixed_source_alongside_prefixed(self, temp_dir: Path) -> None:
        """Should support mixing prefixed and unprefixed sources."""
        source1 = temp_dir / "main"
        source2 = temp_dir / "apps"
        source1.mkdir()
        source2.mkdir()

        create_component_package(source1, "shared", "export default function() {}")
        create_component_package(source2, "custom", "export default function() {}")

        registry = ComponentRegistry()
        registry.add_source(source1)  # No prefix
        registry.add_source(source2, prefix="myapp")

        assert "shared" in registry.components
        assert "myapp:custom" in registry.components

    def test_constructor_with_prefix(self, temp_dir: Path) -> None:
        """Should support prefix in constructor."""
        create_component_package(
            temp_dir / "widgets", "counter", "export default function() {}"
        )

        registry = ComponentRegistry(temp_dir, prefix="store")

        assert "store:widgets.counter" in registry.components

    def test_refresh_preserves_sources(self, temp_dir: Path) -> None:
        """Should preserve all sources during refresh."""
        source1 = temp_dir / "source1"
        source2 = temp_dir / "source2"
        source1.mkdir()
        source2.mkdir()

        create_component_package(source1, "widget", "export default function() {}")

        registry = ComponentRegistry()
        registry.add_source(source1, prefix="app1")
        registry.add_source(source2, prefix="app2")

        # Add component to source2 after initial add
        create_component_package(source2, "new", "export default function() {}")

        registry.refresh()

        assert "app1:widget" in registry.components
        assert "app2:new" in registry.components
