"""Shared pytest fixtures for wilco backend tests."""

import tempfile
from pathlib import Path
from typing import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from wilco import ComponentRegistry
from wilco.bundler import clear_esbuild_cache
from wilco.bridges.fastapi import create_router


@pytest.fixture
def client(sample_component_dir: Path) -> Generator[TestClient, None, None]:
    """Create a test client for the FastAPI app with sample components."""
    app = FastAPI()
    registry = ComponentRegistry(sample_component_dir)
    router = create_router(registry)
    app.include_router(router, prefix="/api")
    with TestClient(app) as c:
        yield c


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


def create_component_package(
    parent_dir: Path,
    name: str,
    tsx_content: str,
    schema: dict | None = None,
) -> Path:
    """Helper to create a component package with the new structure."""
    pkg_dir = parent_dir / name
    pkg_dir.mkdir(parents=True, exist_ok=True)

    # Create __init__.py
    (pkg_dir / "__init__.py").write_text(f"# {name} component package\n")

    # Create index.tsx
    (pkg_dir / "index.tsx").write_text(tsx_content)

    # Create schema.json if provided
    if schema:
        import json

        (pkg_dir / "schema.json").write_text(json.dumps(schema, indent=2))

    return pkg_dir


@pytest.fixture
def sample_component_dir(temp_dir: Path) -> Path:
    """Create a sample component directory structure with valid components."""
    # Create category directory
    category_dir = temp_dir / "widgets"
    category_dir.mkdir()

    # Create a valid counter component package
    create_component_package(
        category_dir,
        "counter",
        tsx_content="""
import { useState } from "react";

interface CounterProps {
  initialValue?: number;
}

export default function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
""",
        schema={
            "title": "Test Counter",
            "description": "A test counter component",
            "type": "object",
            "properties": {
                "initialValue": {
                    "type": "number",
                    "default": 0,
                }
            },
        },
    )

    # Create a component without schema (should still work)
    create_component_package(
        category_dir,
        "simple",
        tsx_content="""
export default function Simple() {
  return <div>Simple</div>;
}
""",
    )

    return temp_dir


@pytest.fixture
def sample_registry(sample_component_dir: Path) -> ComponentRegistry:
    """Create a registry with sample components."""
    return ComponentRegistry(sample_component_dir)


@pytest.fixture
def empty_component_dir(temp_dir: Path) -> Path:
    """Create an empty component directory."""
    return temp_dir


@pytest.fixture(autouse=True)
def reset_bundler_cache() -> Generator[None, None, None]:
    """Reset bundler cache before each test."""
    clear_esbuild_cache()
    yield
    clear_esbuild_cache()


@pytest.fixture
def sample_tsx_file(temp_dir: Path) -> Path:
    """Create a sample TSX file for bundling tests."""
    tsx_file = temp_dir / "sample.tsx"
    tsx_file.write_text("""
import { useState } from "react";

export default function Sample() {
  const [value, setValue] = useState(0);
  return <div>{value}</div>;
}
""")
    return tsx_file


@pytest.fixture
def invalid_tsx_file(temp_dir: Path) -> Path:
    """Create an invalid TSX file that will fail bundling."""
    tsx_file = temp_dir / "invalid.tsx"
    tsx_file.write_text("""
// This is invalid TypeScript/JSX
export default function Invalid( {
  return <div>missing closing paren
}
""")
    return tsx_file
