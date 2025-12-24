"""wilco.bridges - Web framework integrations.

Each bridge is a separate package with its own dependency check:

    from wilco.bridges.fastapi import create_router  # Requires: pip install wilco[fastapi]
    from wilco.bridges.django import ...             # Requires: pip install wilco[django]
"""
