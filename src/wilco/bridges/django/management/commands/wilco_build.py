"""Django management command to pre-compile component bundles."""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from wilco.bridges.django.views import get_registry
from wilco.build import build_components


class Command(BaseCommand):
    help = "Pre-compile wilco component bundles for production deployment"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            type=str,
            default=None,
            help="Output directory (default: WILCO_BUILD_DIR or BASE_DIR/dist/wilco/)",
        )
        parser.add_argument(
            "--no-minify",
            action="store_true",
            default=False,
            help="Disable minification",
        )
        parser.add_argument(
            "--sourcemap",
            action="store_true",
            default=False,
            help="Include source maps",
        )

    def handle(self, *args, **options):
        registry = get_registry()

        if options["output"]:
            output_dir = Path(options["output"])
        else:
            # Use WILCO_BUILD_DIR if configured, otherwise BASE_DIR/dist/wilco/
            build_dir = getattr(settings, "WILCO_BUILD_DIR", None)
            if build_dir:
                output_dir = Path(build_dir)
            else:
                output_dir = Path(settings.BASE_DIR) / "dist" / "wilco"

        minify = not options["no_minify"]
        sourcemap = options["sourcemap"]

        result = build_components(registry, output_dir, minify=minify, sourcemap=sourcemap)

        self.stdout.write(self.style.SUCCESS(f"Built {result.component_count} components to {result.output_dir}"))
        self.stdout.write(self.style.NOTICE("Run 'manage.py collectstatic' to copy bundles to STATIC_ROOT."))
