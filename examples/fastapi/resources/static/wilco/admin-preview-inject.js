/**
 * Wilco Admin Preview Injector for SQLAdmin
 *
 * This script injects a live preview panel into SQLAdmin edit pages.
 * It detects when we're on a product edit page and adds a preview component
 * that updates in real-time as the form is edited.
 */

(function() {
  'use strict';

  /**
   * Check if we're on a product edit page.
   * SQLAdmin uses /admin/product/edit/{pk} and /admin/product/create
   */
  function isProductEditPage() {
    var path = window.location.pathname;
    return path.match(/\/admin\/product\/edit\/\d+/) || path === '/admin/product/create';
  }

  /**
   * Get the product ID from the URL.
   */
  function getProductId() {
    var match = window.location.pathname.match(/\/admin\/product\/edit\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Inject responsive CSS styles for the two-column layout.
   */
  function injectStyles() {
    if (document.getElementById('wilco-preview-styles')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'wilco-preview-styles';
    style.textContent = '\
      .wilco-layout-container {\
        display: flex;\
        gap: 0;\
      }\
\
      .wilco-layout-container.wilco-stacked {\
        flex-direction: column;\
      }\
\
      .wilco-form-column {\
        flex: 1 1 auto;\
        min-width: 0;\
      }\
\
      .wilco-resize-handle {\
        flex: 0 0 4px;\
        background: #dee2e6;\
        cursor: col-resize;\
        display: flex;\
        align-items: center;\
        justify-content: center;\
        transition: background-color 0.15s;\
        margin: 0 0.5rem;\
        border-radius: 2px;\
      }\
\
      .wilco-resize-handle:hover,\
      .wilco-resize-handle.wilco-dragging {\
        background: #adb5bd;\
      }\
\
      .wilco-layout-container.wilco-stacked .wilco-resize-handle {\
        display: none;\
      }\
\
      .wilco-preview-column {\
        flex: 0 0 320px;\
        position: sticky;\
        top: 1rem;\
        align-self: flex-start;\
        max-height: calc(100vh - 2rem);\
        overflow-y: auto;\
      }\
\
      .wilco-layout-container.wilco-stacked .wilco-preview-column {\
        flex: 1 1 auto;\
        width: 100%;\
        position: static;\
        max-height: none;\
        overflow: visible;\
        margin-top: 1.5rem;\
      }\
\
      .wilco-preview-panel {\
        padding: 0;\
      }\
\
      .wilco-layout-container.wilco-stacked .wilco-preview-panel {\
        border-top: 1px solid #dee2e6;\
        padding-top: 1rem;\
      }\
\
      .wilco-layout-container.wilco-stacked #wilco-preview-container {\
        min-height: 50vh;\
        max-height: 75vh;\
        overflow: auto;\
      }\
\
      .wilco-preview-panel h4 {\
        margin: 0 0 0.75rem 0;\
        font-size: 0.85rem;\
        color: #6c757d;\
        display: flex;\
        align-items: center;\
        justify-content: space-between;\
        text-transform: uppercase;\
        letter-spacing: 0.5px;\
      }\
\
      .wilco-preview-panel h4 span {\
        display: flex;\
        align-items: center;\
      }\
\
      .wilco-layout-toggle {\
        background: none;\
        border: 1px solid #dee2e6;\
        border-radius: 4px;\
        padding: 0.25rem 0.5rem;\
        font-size: 0.7rem;\
        color: #6c757d;\
        cursor: pointer;\
        transition: all 0.15s;\
      }\
\
      .wilco-layout-toggle:hover {\
        background: #e9ecef;\
        color: #495057;\
      }\
\
      #wilco-preview-container {\
        min-height: 100px;\
        overflow-x: auto;\
      }\
\
      @media (max-width: 768px) {\
        .wilco-layout-container {\
          flex-direction: column !important;\
        }\
\
        .wilco-resize-handle {\
          display: none !important;\
        }\
\
        .wilco-preview-column {\
          flex: 1 1 auto !important;\
          width: 100% !important;\
          position: static !important;\
          max-height: none !important;\
          margin-top: 1.5rem !important;\
        }\
\
        .wilco-preview-panel {\
          margin-left: 0 !important;\
        }\
      }\
\
      .wilco-resizing * {\
        user-select: none !important;\
      }\
    ';
    document.head.appendChild(style);
  }

  /**
   * Get the admin type from the current URL.
   */
  function getAdminType() {
    var match = window.location.pathname.match(/\/admin\/([^/]+)/);
    return match ? match[1] : 'default';
  }

  /**
   * Get the localStorage key for storing preview width.
   */
  function getStorageKey() {
    return 'wilco-preview-width-' + getAdminType();
  }

  /**
   * Get the stored preview width from localStorage.
   */
  function getStoredWidth() {
    try {
      var stored = localStorage.getItem(getStorageKey());
      if (stored) {
        return parseInt(stored, 10);
      }
    } catch (e) {
      // localStorage not available
    }
    return 320;
  }

  /**
   * Store the preview width in localStorage.
   */
  function storeWidth(width) {
    try {
      localStorage.setItem(getStorageKey(), width.toString());
    } catch (e) {
      // localStorage not available
    }
  }

  /**
   * Check if width exceeds 50% of container and update layout accordingly.
   */
  function updateLayoutMode(container, previewColumn, width) {
    var containerWidth = container.offsetWidth;
    var maxSidebarWidth = containerWidth * 0.5;

    if (width > maxSidebarWidth) {
      container.classList.add('wilco-stacked');
      previewColumn.style.flex = '';
    } else {
      container.classList.remove('wilco-stacked');
      previewColumn.style.flex = '0 0 ' + width + 'px';
    }
  }

  /**
   * Initialize resize functionality for the preview column.
   */
  function initResize(layoutContainer, resizeHandle, previewColumn) {
    var isResizing = false;
    var startX = 0;
    var startWidth = 0;

    var savedWidth = getStoredWidth();
    var containerWidth = layoutContainer.offsetWidth;
    var maxWidth = Math.floor(containerWidth * 0.5);
    var initialWidth = Math.min(savedWidth, maxWidth);
    updateLayoutMode(layoutContainer, previewColumn, initialWidth);

    updateToggleIcon(layoutContainer);

    resizeHandle.addEventListener('mousedown', function(e) {
      if (layoutContainer.classList.contains('wilco-stacked')) {
        return;
      }

      isResizing = true;
      startX = e.clientX;
      startWidth = previewColumn.offsetWidth;
      document.body.classList.add('wilco-resizing');
      resizeHandle.classList.add('wilco-dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isResizing) return;

      var containerWidth = layoutContainer.offsetWidth;
      var maxWidth = Math.floor(containerWidth * 0.5);
      var delta = startX - e.clientX;
      var newWidth = Math.max(200, Math.min(startWidth + delta, maxWidth));

      updateLayoutMode(layoutContainer, previewColumn, newWidth);
    });

    document.addEventListener('mouseup', function() {
      if (!isResizing) return;

      isResizing = false;
      document.body.classList.remove('wilco-resizing');
      resizeHandle.classList.remove('wilco-dragging');

      var finalWidth = previewColumn.offsetWidth;
      if (!layoutContainer.classList.contains('wilco-stacked')) {
        storeWidth(finalWidth);
      }
    });

    window.addEventListener('resize', function() {
      if (layoutContainer.classList.contains('wilco-stacked')) {
        return;
      }
      var currentWidth = getStoredWidth();
      var containerWidth = layoutContainer.offsetWidth;
      var maxWidth = Math.floor(containerWidth * 0.5);
      var cappedWidth = Math.min(currentWidth, maxWidth);
      updateLayoutMode(layoutContainer, previewColumn, cappedWidth);
    });
  }

  /**
   * Update the toggle button icon based on current layout mode.
   */
  function updateToggleIcon(layoutContainer) {
    var toggleBtn = layoutContainer.querySelector('.wilco-layout-toggle');
    if (!toggleBtn) return;

    var icon = toggleBtn.querySelector('i');
    if (!icon) return;

    var isStacked = layoutContainer.classList.contains('wilco-stacked');
    if (isStacked) {
      icon.className = 'fa fa-compress';
      toggleBtn.title = 'Pin to sidebar';
    } else {
      icon.className = 'fa fa-expand';
      toggleBtn.title = 'Expand to full width';
    }
  }

  /**
   * Create the preview panel HTML.
   */
  function createPreviewPanel(productId, layoutContainer) {
    var validateUrl = productId
      ? '/admin/product/' + productId + '/preview'
      : '/admin/product/preview';

    var panel = document.createElement('div');
    panel.className = 'wilco-preview-panel';

    panel.innerHTML = '\
      <h4>\
        <span>\
          <i class="fa fa-eye" style="margin-right: 0.5rem;"></i>\
          Live Preview\
        </span>\
        <button type="button" class="wilco-layout-toggle" title="Expand to full width">\
          <i class="fa fa-expand"></i>\
        </button>\
      </h4>\
      <div id="wilco-preview-container"\
           data-wilco-component="store:product_preview"\
           data-wilco-props="{}"\
           data-wilco-api="/api"\
           data-wilco-live="true"\
           data-wilco-validate-url="' + validateUrl + '">\
        <div style="color: #6c757d; text-align: center; padding: 2rem;">\
          Loading preview...\
        </div>\
      </div>\
    ';

    var toggleBtn = panel.querySelector('.wilco-layout-toggle');
    toggleBtn.addEventListener('click', function() {
      var isStacked = layoutContainer.classList.contains('wilco-stacked');
      var previewColumn = layoutContainer.querySelector('.wilco-preview-column');

      if (isStacked) {
        var containerWidth = layoutContainer.offsetWidth;
        var maxWidth = Math.floor(containerWidth * 0.5);
        var savedWidth = getStoredWidth();
        var targetWidth = savedWidth <= maxWidth ? savedWidth : maxWidth;

        layoutContainer.classList.remove('wilco-stacked');
        previewColumn.style.flex = '0 0 ' + targetWidth + 'px';
        storeWidth(targetWidth);
      } else {
        layoutContainer.classList.add('wilco-stacked');
        previewColumn.style.flex = '';
      }

      updateToggleIcon(layoutContainer);
    });

    return panel;
  }

  /**
   * Inject the preview panel into the page with two-column layout.
   */
  function injectPreviewPanel() {
    if (!isProductEditPage()) {
      return;
    }

    var checkForm = setInterval(function() {
      // SQLAdmin uses Bootstrap cards with .card-body containing the form
      var cardBody = document.querySelector('.card-body');
      if (!cardBody) {
        return;
      }

      if (document.querySelector('.wilco-layout-container')) {
        clearInterval(checkForm);
        return;
      }

      clearInterval(checkForm);

      injectStyles();

      var layoutContainer = document.createElement('div');
      layoutContainer.className = 'wilco-layout-container';

      var formColumn = document.createElement('div');
      formColumn.className = 'wilco-form-column';

      while (cardBody.firstChild) {
        formColumn.appendChild(cardBody.firstChild);
      }

      var resizeHandle = document.createElement('div');
      resizeHandle.className = 'wilco-resize-handle';
      resizeHandle.title = 'Drag to resize preview';

      var previewColumn = document.createElement('div');
      previewColumn.className = 'wilco-preview-column';

      var productId = getProductId();
      var panel = createPreviewPanel(productId, layoutContainer);
      previewColumn.appendChild(panel);

      layoutContainer.appendChild(formColumn);
      layoutContainer.appendChild(resizeHandle);
      layoutContainer.appendChild(previewColumn);

      cardBody.appendChild(layoutContainer);

      initResize(layoutContainer, resizeHandle, previewColumn);

      console.log('Wilco Admin Preview: Resizable two-column layout injected');

      loadWilcoScripts().then(function() {
        waitForWilco(function() {
          var container = document.getElementById('wilco-preview-container');
          if (container && window.wilco && window.wilco.renderComponent) {
            var componentName = container.dataset.wilcoComponent;
            var propsJson = container.dataset.wilcoProps || '{}';
            var apiBase = container.dataset.wilcoApi || '/api';
            var hash = container.dataset.wilcoHash;

            var props = {};
            try {
              props = JSON.parse(propsJson);
            } catch (e) {
              console.error('Wilco Admin Preview: Invalid props JSON', e);
            }

            console.log('Wilco Admin Preview: Rendering component', componentName);
            window.wilco.renderComponent(container, componentName, props, apiBase, hash);
          }
        });
      });
    }, 100);

    setTimeout(function() { clearInterval(checkForm); }, 5000);
  }

  /**
   * Wait for wilco to be available.
   */
  function waitForWilco(callback, maxAttempts) {
    maxAttempts = maxAttempts || 50;
    var attempts = 0;
    var check = function() {
      attempts++;
      if (window.wilco && window.wilco.renderComponent) {
        callback();
      } else if (attempts < maxAttempts) {
        setTimeout(check, 100);
      } else {
        console.warn('Wilco Admin Preview: Timeout waiting for wilco');
      }
    };
    check();
  }

  /**
   * Load the wilco scripts.
   */
  function loadWilcoScripts() {
    return new Promise(function(resolve) {
      var scriptsToLoad = 0;
      var scriptsLoaded = 0;

      var onScriptLoad = function() {
        scriptsLoaded++;
        if (scriptsLoaded >= scriptsToLoad) {
          resolve();
        }
      };

      if (!document.querySelector('script[src*="loader.js"]')) {
        scriptsToLoad++;
        var loaderScript = document.createElement('script');
        loaderScript.src = '/wilco-static/wilco/loader.js';
        loaderScript.onload = onScriptLoad;
        document.body.appendChild(loaderScript);
      }

      if (!document.querySelector('script[src*="live-loader-fastapi.js"]')) {
        scriptsToLoad++;
        var liveLoaderScript = document.createElement('script');
        liveLoaderScript.src = '/static/wilco/live-loader-fastapi.js';
        liveLoaderScript.onload = onScriptLoad;
        document.body.appendChild(liveLoaderScript);
      }

      if (scriptsToLoad === 0) {
        resolve();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPreviewPanel);
  } else {
    injectPreviewPanel();
  }

  // Also handle navigation (for SPAs)
  window.addEventListener('popstate', injectPreviewPanel);

})();
