"""Django admin integration for wilco components with live preview support."""

from abc import abstractmethod
from typing import Any

from django.contrib import admin
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.urls import path

from .widgets import WilcoComponentWidget


class LivePreviewAdminMixin:
    """Mixin for Django ModelAdmin to enable live preview of wilco components.

    This mixin provides:
    - A `preview` readonly field that renders a wilco component
    - A `validate_preview` view that validates form data and returns props
    - Automatic URL registration for the validation endpoint

    Usage:
        @admin.register(Product)
        class ProductAdmin(LivePreviewAdminMixin, admin.ModelAdmin):
            preview_component = "store:product"
            readonly_fields = ["preview"]

            def get_preview_props(self, form_data):
                return {
                    "name": form_data.get("name", ""),
                    "price": float(form_data.get("price", 0)),
                }

    The mixin will:
    1. Render the component in a live preview container
    2. Listen for form field blur events
    3. POST form data to validate_preview endpoint
    4. Update the preview with new props or show validation errors
    """

    # Must be set by the implementing class
    preview_component: str = ""

    @abstractmethod
    def get_preview_props(self, form_data: dict[str, Any], instance: Any = None) -> dict[str, Any]:
        """Convert form data to component props.

        This method must be implemented by the admin class to map form field
        values to the component's expected props.

        Args:
            form_data: Dictionary of form field values from the POST data.
            instance: The existing model instance when editing (None for new objects).
                      Useful for preserving file fields during live preview.

        Returns:
            Dictionary of props to pass to the component.
        """
        raise NotImplementedError("Subclasses must implement get_preview_props")

    def get_urls(self):
        """Add the validate_preview URL to the admin URLs."""
        urls = super().get_urls()  # type: ignore[misc]
        custom_urls = [
            path(
                "<path:object_id>/validate_preview/",
                self.admin_site.admin_view(self.validate_preview),  # type: ignore[attr-defined]
                name=f"{self.model._meta.app_label}_{self.model._meta.model_name}_validate_preview",  # type: ignore[attr-defined]
            ),
        ]
        return custom_urls + urls

    def validate_preview(self, request: HttpRequest, object_id: str = "") -> HttpResponse:
        """Validate form data and return props or errors.

        This endpoint accepts POST requests with form data, validates it using
        the model's form, and returns either:
        - {success: true, props: {...}} on valid data
        - {success: false, errors: {...}} on invalid data

        Args:
            request: The HTTP request object.
            object_id: The ID of the object being edited (may be empty for new objects).

        Returns:
            JsonResponse with validation result.
        """
        if request.method != "POST":
            return HttpResponse(status=405)

        # Get existing instance if editing
        instance = None
        if object_id:
            try:
                instance = self.model.objects.get(pk=object_id)  # type: ignore[attr-defined]
            except self.model.DoesNotExist:  # type: ignore[attr-defined]
                pass

        # Get the form class for this admin
        form_class = self.get_form(request)  # type: ignore[attr-defined]

        # Create form instance with POST data
        form = form_class(data=request.POST, instance=instance)

        if form.is_valid():
            # Get props from the validated form data
            props = self.get_preview_props(form.cleaned_data, instance=instance)
            return JsonResponse({"success": True, "props": props})
        else:
            # Return validation errors
            errors = {field: [str(e) for e in error_list] for field, error_list in form.errors.items()}
            return JsonResponse({"success": False, "errors": errors})

    @admin.display(description="Preview")
    def preview(self, obj: Any) -> str:
        """Render the preview widget for the admin interface.

        Args:
            obj: The model instance being viewed/edited.

        Returns:
            Safe HTML string containing the live preview widget.
        """
        # Get the validation URL for this object
        if obj and obj.pk:
            validate_url = f"../../{obj.pk}/validate_preview/"
        else:
            validate_url = "../validate_preview/"

        # Get initial props from the current object state
        if obj and obj.pk:
            initial_props = self.get_preview_props_from_obj(obj)
        else:
            initial_props = {}

        return WilcoComponentWidget(
            self.preview_component,
            props=initial_props,
            live=True,
            validate_url=validate_url,
        ).render()

    def get_preview_props_from_obj(self, obj: Any) -> dict[str, Any]:
        """Get props from an existing model instance.

        Override this method if you need different logic for extracting props
        from an existing object vs. from form data.

        By default, this creates form data from the object and passes it to
        get_preview_props.

        Args:
            obj: The model instance.

        Returns:
            Dictionary of props for the component.
        """
        # Build form data from object fields
        form_data = {}
        for field in obj._meta.fields:
            value = getattr(obj, field.name, None)
            if value is not None:
                form_data[field.name] = value
        return self.get_preview_props(form_data, instance=obj)
