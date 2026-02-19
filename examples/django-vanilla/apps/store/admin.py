from typing import Any

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from wilco.bridges.django import LivePreviewAdminMixin

from .models import Product


@admin.register(Product)
class ProductAdmin(LivePreviewAdminMixin, admin.ModelAdmin):
    """Admin for Product with live preview support.

    Uses standard Django admin (not Unfold).
    The preview updates automatically when form fields lose focus,
    showing validation errors or the updated component.
    """

    # Component to render for preview (shows both list and detail modes)
    preview_component = "store:product_preview"

    list_display = ["thumbnail", "name", "price", "created_at"]
    list_display_links = ["thumbnail", "name"]

    @admin.display(description="")
    def thumbnail(self, obj: Product) -> str:
        """Display a small thumbnail in the list view."""
        if obj.image:
            return format_html(
                '<img src="{}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">',
                obj.image.url,
            )
        return format_html('<div style="width: 40px; height: 40px; background: #e0e0e0; border-radius: 4px;"></div>')

    search_fields = ["name", "description"]
    readonly_fields = ["preview"]

    fieldsets = (
        (
            _("Details"),
            {
                "fields": ["name", "price", "description", "image"],
            },
        ),
        (
            _("Preview"),
            {
                "fields": ["preview"],
            },
        ),
    )

    def get_preview_props(self, form_data: dict[str, Any], instance: Any = None) -> dict[str, Any]:
        """Convert form data to component props.

        Args:
            form_data: Dictionary of cleaned form field values.
            instance: The existing model instance when editing.

        Returns:
            Props for the store:product component.
        """
        # Handle both cleaned_data (with proper types) and raw form data
        price = form_data.get("price", 0)
        if isinstance(price, str):
            try:
                price = float(price) if price else 0
            except ValueError:
                price = 0

        # For image: use form_data if it has a URL, otherwise fall back to instance
        image_url = "https://picsum.photos/seed/placeholder/600/400"
        image = form_data.get("image")
        if image and hasattr(image, "url"):
            image_url = image.url
        elif instance and instance.image:
            image_url = instance.image.url

        return {
            "name": form_data.get("name", ""),
            "price": float(price),
            "description": form_data.get("description", "") or "",
            "imageUrl": image_url,
        }
