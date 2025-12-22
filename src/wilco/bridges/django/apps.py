"""Django app configuration for wilco bridge."""

from django.apps import AppConfig


class WilcoBridgeConfig(AppConfig):
    """Django app configuration for the wilco component bridge."""

    name = "wilco.bridges.django"
    label = "wilco_bridge"
    verbose_name = "Wilco Component Bridge"
