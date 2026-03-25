"""Entry point for the wilco CLI.

Subcommands:
    wilco serve   - Start the development server (default)
    wilco build   - Pre-compile component bundles for production
"""

import argparse
from pathlib import Path


def _resolve_components_dir(components_dir: str | None) -> Path:
    """Resolve the components directory from CLI arg or defaults."""
    if components_dir is not None:
        return Path(components_dir)

    local_components = Path.cwd() / "components"
    if local_components.exists():
        return local_components

    return Path(__file__).parent / "examples"


def create_parser() -> argparse.ArgumentParser:
    """Create the CLI argument parser with subcommands."""
    parser = argparse.ArgumentParser(
        prog="wilco",
        description="Serve React components from Python",
    )

    subparsers = parser.add_subparsers(dest="command")

    # serve subcommand
    serve_parser = subparsers.add_parser("serve", help="Start the development server")
    serve_parser.add_argument("--components-dir", help="Path to components directory")

    # build subcommand
    build_parser = subparsers.add_parser("build", help="Pre-compile component bundles")
    build_parser.add_argument("--output", required=True, help="Output directory for pre-built bundles")
    build_parser.add_argument("--components-dir", help="Path to components directory")
    build_parser.add_argument("--prefix", default="", help="Prefix for component names (e.g., 'store')")
    build_parser.add_argument("--no-minify", action="store_false", dest="minify", help="Disable minification")
    build_parser.add_argument("--sourcemap", action="store_true", default=False, help="Include source maps")

    return parser


def run_build(
    *,
    components_dir: str | None,
    prefix: str,
    output: str,
    minify: bool,
    sourcemap: bool,
) -> None:
    """Execute the build command."""
    from .build import build_components
    from .registry import ComponentRegistry

    resolved_dir = _resolve_components_dir(components_dir)
    registry = ComponentRegistry()
    registry.add_source(resolved_dir, prefix=prefix)
    output_dir = Path(output)

    result = build_components(registry, output_dir, minify=minify, sourcemap=sourcemap)

    print(f"Built {result.component_count} components to {result.output_dir}")


def create_app(components_dir: Path | None = None):
    """Create a standalone FastAPI app for development.

    Args:
        components_dir: Path to components directory. Defaults to
            ./components or packaged examples.
    """
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    from .bridges.fastapi import create_router
    from .registry import ComponentRegistry

    app = FastAPI(title="wilco", description="Serve React components from Python")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if components_dir is None:
        components_dir = _resolve_components_dir(None)

    registry = ComponentRegistry(components_dir)
    router = create_router(registry)
    app.include_router(router, prefix="/api")

    return app


def _get_app():
    """App factory for uvicorn.

    Avoids importing FastAPI at module level so that ``wilco build`` works
    in environments without FastAPI installed.
    """
    return create_app()


def main() -> None:
    """Main entry point for the wilco CLI."""
    parser = create_parser()
    args = parser.parse_args()

    if args.command == "build":
        run_build(
            components_dir=getattr(args, "components_dir", None),
            prefix=args.prefix,
            output=args.output,
            minify=args.minify,
            sourcemap=args.sourcemap,
        )
    else:
        # Default: serve
        import uvicorn

        uvicorn.run("wilco.__main__:_get_app", host="0.0.0.0", port=8000, reload=True, factory=True)


if __name__ == "__main__":
    main()
