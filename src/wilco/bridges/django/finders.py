"""Custom staticfiles finder for pre-built wilco component bundles.

Discovers pre-built bundles from WILCO_BUILD_DIR and makes them available
to Django's collectstatic under the ``wilco/`` prefix.

Usage in settings.py:

    WILCO_BUILD_DIR = str(BASE_DIR / "dist" / "wilco")

    STATICFILES_FINDERS = [
        "django.contrib.staticfiles.finders.FileSystemFinder",
        "django.contrib.staticfiles.finders.AppDirectoriesFinder",
        "wilco.bridges.django.finders.WilcoBundleFinder",
    ]

After ``wilco build --output dist/wilco/``, running ``collectstatic``
will copy bundles to ``STATIC_ROOT/wilco/bundles/`` and the manifest
to ``STATIC_ROOT/wilco/manifest.json``.
"""

from pathlib import Path

from django.conf import settings
from django.contrib.staticfiles.finders import BaseFinder
from django.core.files.storage import FileSystemStorage


class WilcoBundleFinder(BaseFinder):
    """Finds pre-built wilco bundles for collectstatic.

    Maps files from WILCO_BUILD_DIR under the ``wilco/`` static prefix:
        dist/wilco/manifest.json     → wilco/manifest.json
        dist/wilco/bundles/foo.js    → wilco/bundles/foo.js
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        build_dir = getattr(settings, "WILCO_BUILD_DIR", None)
        self._build_path: Path | None = Path(build_dir) if build_dir else None
        self._storage: FileSystemStorage | None = None

        if self._build_path and self._build_path.exists():
            self._storage = FileSystemStorage(
                location=str(self._build_path),
                base_url=f"{settings.STATIC_URL}wilco/",
            )
            self._storage.prefix = "wilco"

    def find(self, path, all=False, find_all=None):
        """Find a file matching the given relative path."""
        if find_all is not None:
            all = find_all
        if not self._build_path or not path.startswith("wilco/"):
            return [] if all else ""

        # Strip the wilco/ prefix to get the path relative to build dir
        relative = path[len("wilco/"):]
        full_path = (self._build_path / relative).resolve()

        # Prevent path traversal outside the build directory
        if not full_path.is_relative_to(self._build_path.resolve()):
            return [] if all else ""

        if full_path.is_file():
            matched = str(full_path)
            return [matched] if all else matched

        return [] if all else ""

    def list(self, ignore_patterns):
        """List all files in the build directory."""
        if not self._build_path or not self._build_path.exists() or not self._storage:
            return

        for file_path in self._build_path.rglob("*"):
            if not file_path.is_file():
                continue

            # Path relative to the build directory (= relative to storage root)
            relative = str(file_path.relative_to(self._build_path))

            yield relative, self._storage
