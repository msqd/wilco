HTTP Caching
============

This specification defines the expected HTTP caching behavior for all wilco
bridges and implementations. Implementations **must** follow the requirements
marked with *must*, *must not*, *should*, and *should not* (per :rfc:`2119`).

Overview
--------

wilco serves several categories of content, each with different caching
requirements. Aggressive caching of static assets is critical for performance
— without it, every page navigation re-fetches JavaScript loaders and component
bundles, causing visible "Loading component..." placeholders on each click.

Asset Categories
----------------

Component Bundles
^^^^^^^^^^^^^^^^^

**URL pattern**: ``/api/bundles/{name}.js``

Component bundles **must** return::

    Cache-Control: public, max-age=31536000, immutable

Bundles are content-addressed: the loader appends a hash query parameter
(e.g., ``?v=abc123``) for cache busting when content changes. This makes
immutable caching safe — a changed bundle gets a new URL.

Wilco Static Assets
^^^^^^^^^^^^^^^^^^^

**URL pattern**: ``/wilco-static/wilco/loader.js``, ``/wilco-static/wilco/live-loader.js``

Wilco static assets **must** return::

    Cache-Control: public, max-age=31536000, immutable

These files are versioned with the wilco package itself. When the package is
upgraded, the file content changes and the HTML references are updated by the
new version, effectively busting the cache.

Application Static Assets
^^^^^^^^^^^^^^^^^^^^^^^^^

**URL pattern**: ``/static/`` (CSS, fonts, favicon, etc.)

Application static assets **should** return appropriate cache headers with at
least::

    Cache-Control: public, max-age=3600

Implementations may use longer durations with cache-busting strategies (hashed
filenames, query parameters).

Media Files
^^^^^^^^^^^

**URL pattern**: ``/media/`` (user uploads, product images, etc.)

Media files **should** return::

    Cache-Control: public, max-age=86400

or use ``ETag``-based validation caching. Media content changes infrequently
but is not versioned, so a moderate ``max-age`` balances performance with
freshness.

HTML Pages
^^^^^^^^^^

HTML pages **must not** be cached with long ``max-age`` values. They **should**
use ``no-cache`` or a short ``max-age`` to ensure the browser always receives
fresh content with up-to-date component references.

API Metadata
^^^^^^^^^^^^

**URL pattern**: ``/api/bundles/{name}/metadata``

API metadata responses **should not** be cached with long ``max-age`` values.
Component metadata may change during development as schemas evolve.

Summary Table
-------------

.. list-table::
   :widths: 30 40 30
   :header-rows: 1

   * - Asset Type
     - Cache-Control
     - Requirement Level
   * - Component bundles (``.js``)
     - ``public, max-age=31536000, immutable``
     - **must**
   * - Wilco static (``loader.js``)
     - ``public, max-age=31536000, immutable``
     - **must**
   * - App static (CSS, fonts)
     - ``public, max-age=3600`` (minimum)
     - **should**
   * - Media files (images)
     - ``public, max-age=86400``
     - **should**
   * - HTML pages
     - ``no-cache`` or short ``max-age``
     - **must not** cache long
   * - API metadata
     - no long ``max-age``
     - **should not** cache long

Implementation Notes
--------------------

The ``CACHE_CONTROL_IMMUTABLE`` constant is defined in
``wilco.bridges.base`` and **should** be reused by all implementations
for component bundles and wilco static assets::

    from wilco.bridges.base import CACHE_CONTROL_IMMUTABLE
    # Value: "public, max-age=31536000, immutable"
