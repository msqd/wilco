/**
 * Wilco Admin Preview Injector for Flask-Admin
 *
 * This script injects a live preview panel into Flask-Admin edit pages.
 * It detects when we're on a product edit page and adds a preview component
 * that updates in real-time as the form is edited.
 */

(function() {
  'use strict';

  /**
   * Check if we're on a product edit page.
   * Flask-Admin uses /admin/product/edit/?id=X for edit and /admin/product/new/ for create.
   */
  function isProductEditPage() {
    var path = window.location.pathname;
    var search = window.location.search;
    return (path.match(/\/admin\/product\/edit\//) && search.includes('id='))
        || path === '/admin/product/new/'
        || path === '/admin/product/new';
  }

  /**
   * Get the product ID from the URL query string.
   */
  function getProductId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('id');
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

  function getStorageKey() {
    return 'wilco-preview-width-' + getAdminType();
  }

  function getStoredWidth() {
    try {
      var stored = localStorage.getItem(getStorageKey());
      if (stored) {
        return parseInt(stored, 10);
      }
    } catch (e) {}
    return 320;
  }

  function storeWidth(width) {
    try {
      localStorage.setItem(getStorageKey(), width.toString());
    } catch (e) {}
  }

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
      // Flask-Admin wraps the form in <form class="admin-form">
      var formContainer = document.querySelector('form.admin-form');
      if (!formContainer) {
        formContainer = document.querySelector('#edit_form, #create_form');
      }
      if (!formContainer) {
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

      // Move all existing children into formColumn
      while (formContainer.firstChild) {
        formColumn.appendChild(formContainer.firstChild);
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

      formContainer.appendChild(layoutContainer);

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

      if (!document.querySelector('script[src*="live-loader-flask.js"]')) {
        scriptsToLoad++;
        var liveLoaderScript = document.createElement('script');
        liveLoaderScript.src = '/static/wilco/live-loader-flask.js';
        liveLoaderScript.onload = onScriptLoad;
        document.body.appendChild(liveLoaderScript);
      }

      if (scriptsToLoad === 0) {
        resolve();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPreviewPanel);
  } else {
    injectPreviewPanel();
  }

  window.addEventListener('popstate', injectPreviewPanel);

})();
