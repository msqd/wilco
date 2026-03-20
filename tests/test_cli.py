"""Tests for wilco CLI subcommands (__main__.py)."""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


class TestCliParser:
    """Tests for CLI argument parsing."""

    def test_build_subcommand_requires_output(self) -> None:
        """wilco build should require --output argument."""
        from wilco.__main__ import create_parser

        parser = create_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["build"])

    def test_build_subcommand_accepts_output(self) -> None:
        """wilco build --output dir should parse correctly."""
        from wilco.__main__ import create_parser

        parser = create_parser()
        args = parser.parse_args(["build", "--output", "dist/wilco/"])
        assert args.output == "dist/wilco/"

    def test_build_minify_default_true(self) -> None:
        """Build should default to minified output."""
        from wilco.__main__ import create_parser

        parser = create_parser()
        args = parser.parse_args(["build", "--output", "dist/"])
        assert args.minify is True

    def test_build_no_minify_flag(self) -> None:
        """--no-minify should disable minification."""
        from wilco.__main__ import create_parser

        parser = create_parser()
        args = parser.parse_args(["build", "--output", "dist/", "--no-minify"])
        assert args.minify is False

    def test_build_sourcemap_default_false(self) -> None:
        """Build should default to no sourcemaps."""
        from wilco.__main__ import create_parser

        parser = create_parser()
        args = parser.parse_args(["build", "--output", "dist/"])
        assert args.sourcemap is False

    def test_build_sourcemap_flag(self) -> None:
        """--sourcemap should enable sourcemaps."""
        from wilco.__main__ import create_parser

        parser = create_parser()
        args = parser.parse_args(["build", "--output", "dist/", "--sourcemap"])
        assert args.sourcemap is True

    def test_serve_is_default_subcommand(self) -> None:
        """Running wilco with no subcommand should default to serve."""
        from wilco.__main__ import create_parser

        parser = create_parser()
        args = parser.parse_args([])
        assert args.command is None or args.command == "serve"


class TestBuildCommand:
    """Tests for the build command execution."""

    def test_build_calls_build_components(self, sample_component_dir: Path, temp_dir: Path) -> None:
        """Build command should call build_components with correct args."""
        from wilco.__main__ import run_build

        output_dir = temp_dir / "output"

        with patch("wilco.build.build_components") as mock_build:
            mock_build.return_value = MagicMock(component_count=2, output_dir=output_dir)
            run_build(
                components_dir=str(sample_component_dir),
                output=str(output_dir),
                minify=True,
                sourcemap=False,
            )

            mock_build.assert_called_once()
            _, kwargs = mock_build.call_args
            assert kwargs["minify"] is True
            assert kwargs["sourcemap"] is False

    def test_build_uses_examples_as_fallback(self, temp_dir: Path) -> None:
        """Build should use packaged examples when no components dir specified."""
        from wilco.__main__ import run_build

        output_dir = temp_dir / "output"

        with patch("wilco.build.build_components") as mock_build:
            mock_build.return_value = MagicMock(component_count=0, output_dir=output_dir)
            run_build(
                components_dir=None,
                output=str(output_dir),
                minify=True,
                sourcemap=False,
            )

            mock_build.assert_called_once()
