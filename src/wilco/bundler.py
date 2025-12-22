"""TypeScript component bundler using esbuild."""

import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import NoReturn

# Project root: bundler.py -> wilco/ -> src/ -> project root
_PROJECT_ROOT = Path(__file__).parent.parent.parent
_FRONTEND_DIR = _PROJECT_ROOT / "src" / "wilcojs" / "react"
_FRONTEND_BIN = _FRONTEND_DIR / "node_modules" / ".bin"

# Cache for esbuild path to avoid repeated lookups
_esbuild_path_cache: str | None = None


class BundlerNotFoundError(Exception):
    """Raised when no JavaScript bundler is available."""

    pass


def clear_esbuild_cache() -> None:
    """Clear the cached esbuild path. Useful for testing."""
    global _esbuild_path_cache
    _esbuild_path_cache = None


def get_bundler_info() -> dict[str, str | bool | None]:
    """Get diagnostic information about the bundler configuration.

    Returns:
        Dictionary with bundler status and paths
    """
    global _esbuild_path_cache

    info: dict[str, str | bool | None] = {
        "cached_path": _esbuild_path_cache,
        "frontend_dir_exists": _FRONTEND_DIR.exists(),
        "node_modules_exists": (_FRONTEND_DIR / "node_modules").exists(),
        "frontend_esbuild_exists": (_FRONTEND_BIN / "esbuild").exists(),
        "global_esbuild": shutil.which("esbuild"),
        "npm_available": shutil.which("npm") is not None,
        "npx_available": shutil.which("npx") is not None,
    }

    # Try to find esbuild without raising
    try:
        info["resolved_path"] = _find_esbuild()
    except BundlerNotFoundError:
        info["resolved_path"] = None

    return info


def _check_npx_esbuild() -> str | None:
    """Check if npx can run esbuild (will download if needed)."""
    npx = shutil.which("npx")
    if not npx:
        return None

    # Verify npx can find/download esbuild by running version check
    try:
        result = subprocess.run(
            [npx, "--yes", "esbuild", "--version"],
            capture_output=True,
            text=True,
            timeout=30,  # npx may need to download
        )
        if result.returncode == 0:
            return f"{npx} --yes esbuild"
    except (subprocess.TimeoutExpired, OSError):
        pass

    return None


def _find_esbuild() -> str:
    """Find esbuild binary from multiple sources.

    Search order:
    1. Frontend's node_modules (development setup)
    2. Global esbuild in PATH
    3. Common global npm paths
    4. npx fallback (can download esbuild on demand)

    Returns:
        Path or command to run esbuild

    Raises:
        BundlerNotFoundError: If no esbuild installation found
    """
    global _esbuild_path_cache

    # Return cached path if available
    if _esbuild_path_cache is not None:
        return _esbuild_path_cache

    # 1. Frontend's node_modules (most common in development)
    frontend_esbuild = _FRONTEND_BIN / "esbuild"
    if frontend_esbuild.exists():
        _esbuild_path_cache = str(frontend_esbuild)
        return _esbuild_path_cache

    # 2. Global esbuild in PATH
    global_esbuild = shutil.which("esbuild")
    if global_esbuild:
        _esbuild_path_cache = global_esbuild
        return _esbuild_path_cache

    # 3. Common global npm installation paths
    home = Path.home()
    common_paths = [
        home / ".npm-global" / "bin" / "esbuild",
        home / ".local" / "bin" / "esbuild",
        Path("/usr/local/bin/esbuild"),
    ]

    # Add platform-specific paths
    if sys.platform == "win32":
        appdata = os.environ.get("APPDATA", "")
        if appdata:
            common_paths.append(Path(appdata) / "npm" / "esbuild.cmd")
    elif sys.platform == "darwin":
        # Homebrew paths
        common_paths.extend([
            Path("/opt/homebrew/bin/esbuild"),
            Path("/usr/local/bin/esbuild"),
        ])

    for path in common_paths:
        if path.exists():
            _esbuild_path_cache = str(path)
            return _esbuild_path_cache

    # 4. Try npx as last resort (can download esbuild)
    npx_cmd = _check_npx_esbuild()
    if npx_cmd:
        _esbuild_path_cache = npx_cmd
        return _esbuild_path_cache

    # Build helpful error message
    _raise_bundler_not_found()


def _raise_bundler_not_found() -> NoReturn:
    """Raise BundlerNotFoundError with helpful installation instructions."""
    lines = [
        "JavaScript bundler (esbuild) not found.",
        "",
        "To fix this, choose one of the following options:",
        "",
    ]

    # Option 1: Development setup
    lines.extend([
        "Option 1: Install frontend dependencies (recommended for development)",
        f"  cd {_FRONTEND_DIR}",
        "  pnpm install  # or: npm install",
        "",
    ])

    # Option 2: Global install
    lines.extend([
        "Option 2: Install esbuild globally",
        "  npm install -g esbuild",
        "",
    ])

    # Option 3: npx (if npm available but npx failed)
    if shutil.which("npm"):
        lines.extend([
            "Option 3: Ensure npx is available (comes with npm 5.2+)",
            "  npx --version  # Should show version if working",
            "",
        ])

    # Diagnostic info
    lines.extend([
        "Diagnostic info:",
        f"  Frontend dir exists: {_FRONTEND_DIR.exists()}",
        f"  node_modules exists: {(_FRONTEND_DIR / 'node_modules').exists()}",
        f"  npm in PATH: {shutil.which('npm') is not None}",
        f"  npx in PATH: {shutil.which('npx') is not None}",
    ])

    raise BundlerNotFoundError("\n".join(lines))


def _rewrite_source_map_sources(js_code: str, component_name: str) -> str:
    """Rewrite source map to use component:// URLs for better debugging.

    This transforms the inline source map to use friendlier source URLs
    that will appear in stack traces.
    """
    # Find inline source map
    marker = "//# sourceMappingURL=data:application/json;base64,"
    if marker not in js_code:
        return js_code

    parts = js_code.rsplit(marker, 1)
    if len(parts) != 2:
        return js_code

    code_part, b64_map = parts

    # Decode source map
    try:
        map_json = base64.b64decode(b64_map).decode("utf-8")
        source_map = json.loads(map_json)
    except (ValueError, json.JSONDecodeError):
        return js_code

    # Rewrite sources to use component:// URL scheme
    if "sources" in source_map:
        new_sources = []
        for source in source_map["sources"]:
            # Extract just the filename
            source_name = Path(source).name
            new_sources.append(f"component://{component_name}/{source_name}")
        source_map["sources"] = new_sources

    # Re-encode source map
    new_map_json = json.dumps(source_map)
    new_b64_map = base64.b64encode(new_map_json.encode("utf-8")).decode("utf-8")

    return f"{code_part}{marker}{new_b64_map}"


def bundle_component(
    ts_path: Path,
    component_name: str | None = None,
    external_deps: list[str] | None = None,
) -> str:
    """Bundle a TypeScript component to JavaScript with source maps.

    Args:
        ts_path: Path to the .tsx or .ts file
        component_name: Name of the component (for source map URLs)
        external_deps: Dependencies to mark as external (e.g., ['react', 'react-dom'])

    Returns:
        Bundled JavaScript code as string with inline source map

    Raises:
        BundlerNotFoundError: If esbuild is not available
        RuntimeError: If bundling fails
    """
    if external_deps is None:
        external_deps = ["react", "react-dom", "react/jsx-runtime", "@wilcojs/react"]

    if component_name is None:
        component_name = ts_path.stem

    esbuild_cmd = _find_esbuild()

    with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as out_file:
        out_path = out_file.name

    # Build command - esbuild_cmd may be a path or "npx --yes esbuild"
    cmd = esbuild_cmd.split() + [
        str(ts_path),
        "--bundle",
        "--format=esm",
        "--target=es2020",
        "--jsx=automatic",
        "--sourcemap=inline",
        "--sources-content=true",
        f"--outfile={out_path}",
    ]

    for dep in external_deps:
        cmd.append(f"--external:{dep}")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        Path(out_path).unlink(missing_ok=True)
        raise RuntimeError("esbuild timed out after 60 seconds")

    if result.returncode != 0:
        Path(out_path).unlink(missing_ok=True)
        raise RuntimeError(f"esbuild failed: {result.stderr}")

    try:
        with open(out_path) as f:
            js_code = f.read()
    finally:
        Path(out_path).unlink(missing_ok=True)

    # Rewrite source map sources for better debugging
    js_code = _rewrite_source_map_sources(js_code, component_name)

    return js_code
