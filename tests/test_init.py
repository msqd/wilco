"""Tests for wilco package initialization."""

import wilco


class TestPackageInit:
    """Tests for package initialization."""

    def test_version_exists(self) -> None:
        """Package should have __version__ attribute."""
        assert hasattr(wilco, "__version__")

    def test_version_is_string(self) -> None:
        """Version should be a string."""
        assert isinstance(wilco.__version__, str)

    def test_version_is_semver(self) -> None:
        """Version should follow semver format (x.y.z)."""
        version = wilco.__version__
        parts = version.split(".")

        # Should have at least major.minor.patch
        assert len(parts) >= 3

        # First three parts should be numeric
        for part in parts[:3]:
            # Handle pre-release versions like "0.1.0-alpha"
            numeric_part = part.split("-")[0]
            assert numeric_part.isdigit(), f"Invalid version part: {part}"
