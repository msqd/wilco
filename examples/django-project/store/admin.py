from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin
from wilco.bridges.django import WilcoComponentWidget

from .models import Product


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    list_display = ["name", "price", "created_at"]
    search_fields = ["name", "description"]
    readonly_fields = ["preview"]

    fieldsets = (
        (
            _("Details"),
            {
                "classes": ["tab"],
                "fields": ["name", "price", "description", "image_url"],
            },
        ),
        (
            _("Preview"),
            {
                "classes": ["tab"],
                "fields": ["preview"],
            },
        ),
    )

    @admin.display(description="Product Preview")
    def preview(self, obj):
        """Render the product using a wilco component."""
        if not obj.pk:
            return "Save the product first to see preview"

        return WilcoComponentWidget(
            "store:product",
            props={
                "name": obj.name,
                "price": float(obj.price),
                "description": obj.description or "",
                "imageUrl": obj.image_url or "https://picsum.photos/seed/placeholder/600/400",
            },
        ).render()
