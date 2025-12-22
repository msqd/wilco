"""URL patterns for wilco component bridge.

Include these in your project's urlconf:

    from django.urls import include, path

    urlpatterns = [
        path("api/", include("wilco.bridges.django.urls")),
    ]
"""

from django.urls import path

from . import views

app_name = "wilco"

urlpatterns = [
    path("bundles/", views.list_bundles, name="list_bundles"),
    path("bundles/<path:name>.js", views.get_bundle, name="get_bundle"),
    path("bundles/<path:name>/metadata/", views.get_metadata, name="get_metadata"),
]
