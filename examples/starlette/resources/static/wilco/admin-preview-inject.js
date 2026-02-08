/**
 * Wilco Admin Preview Injector for Starlette-Admin
 *
 * This script injects a live preview panel into Starlette-Admin edit pages.
 * It detects when we're on a product edit page and adds a preview component
 * that updates in real-time as the form is edited.
 */

(function() {
  'use strict';

  /**
   * Check if we're on a product edit page.
   */
  function isProductEditPage() {
    const path = window.location.pathname;
    return path.match(/\/admin\/product\/edit\/\d+/) || path === '/admin/product/create';
  }

  /**
   * Get the product ID from the URL.
   */
  function getProductId() {
    const match = window.location.pathname.match(/\/admin\/product\/edit\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Inject responsive CSS styles for the two-column layout.
   */
  function injectStyles() {
    if (document.getElementById('wilco-preview-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'wilco-preview-styles';
    style.textContent = `
      .wilco-layout-container {
        display: flex;
        gap: 0;
      }

      .wilco-layout-container.wilco-stacked {
        flex-direction: column;
      }

      .wilco-form-column {
        flex: 1 1 auto;
        min-width: 0;
      }

      .wilco-resize-handle {
        flex: 0 0 4px;
        background: #dee2e6;
        cursor: col-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.15s;
        margin: 0 0.5rem;
        border-radius: 2px;
      }

      .wilco-resize-handle:hover,
      .wilco-resize-handle.wilco-dragging {
        background: #adb5bd;
      }

      .wilco-layout-container.wilco-stacked .wilco-resize-handle {
        display: none;
      }

      .wilco-preview-column {
        flex: 0 0 320px;
        position: sticky;
        top: 1rem;
        align-self: flex-start;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
      }

      .wilco-layout-container.wilco-stacked .wilco-preview-column {
        flex: 1 1 auto;
        width: 100%;
        position: static;
        max-height: none;
        overflow: visible;
        margin-top: 1.5rem;
      }

      .wilco-preview-panel {
        padding: 0;
      }

      .wilco-layout-container.wilco-stacked .wilco-preview-panel {
        border-top: 1px solid #dee2e6;
        padding-top: 1rem;
      }

      .wilco-layout-container.wilco-stacked #wilco-preview-container {
        min-height: 50vh;
        max-height: 75vh;
        overflow: auto;
      }

      .wilco-preview-panel h4 {
        margin: 0 0 0.75rem 0;
        font-size: 0.85rem;
        color: #6c757d;
        display: flex;
        align-items: center;
        justify-content: space-between;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .wilco-preview-panel h4 span {
        display: flex;
        align-items: center;
      }

      .wilco-layout-toggle {
        background: none;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        font-size: 0.7rem;
        color: #6c757d;
        cursor: pointer;
        transition: all 0.15s;
      }

      .wilco-layout-toggle:hover {
        background: #e9ecef;
        color: #495057;
      }

      #wilco-preview-container {
        min-height: 100px;
        overflow-x: auto;
      }

      /* On small screens, always stack */
      @media (max-width: 768px) {
        .wilco-layout-container {
          flex-direction: column !important;
        }

        .wilco-resize-handle {
          display: none !important;
        }

        .wilco-preview-column {
          flex: 1 1 auto !important;
          width: 100% !important;
          position: static !important;
          max-height: none !important;
          margin-top: 1.5rem !important;
        }

        .wilco-preview-panel {
          margin-left: 0 !important;
        }
      }

      /* Prevent text selection while dragging */
      .wilco-resizing * {
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get the admin type from the current URL (e.g., "product", "category").
   */
  function getAdminType() {
    const match = window.location.pathname.match(/\/admin\/([^/]+)/);
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
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        return parseInt(stored, 10);
      }
    } catch (e) {
      // localStorage not available
    }
    return 320; // default width
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
    const containerWidth = container.offsetWidth;
    const maxSidebarWidth = containerWidth * 0.5;

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
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    // Restore saved width (capped at 50%)
    const savedWidth = getStoredWidth();
    const containerWidth = layoutContainer.offsetWidth;
    const maxWidth = Math.floor(containerWidth * 0.5);
    const initialWidth = Math.min(savedWidth, maxWidth);
    updateLayoutMode(layoutContainer, previewColumn, initialWidth);

    // Update toggle icon based on initial state
    updateToggleIcon(layoutContainer);

    resizeHandle.addEventListener('mousedown', function(e) {
      // Don't allow resize in stacked mode
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

      // Calculate new width (dragging left increases width, right decreases)
      // Cap at 50% of container width
      const containerWidth = layoutContainer.offsetWidth;
      const maxWidth = Math.floor(containerWidth * 0.5);
      const delta = startX - e.clientX;
      const newWidth = Math.max(200, Math.min(startWidth + delta, maxWidth));

      updateLayoutMode(layoutContainer, previewColumn, newWidth);
    });

    document.addEventListener('mouseup', function() {
      if (!isResizing) return;

      isResizing = false;
      document.body.classList.remove('wilco-resizing');
      resizeHandle.classList.remove('wilco-dragging');

      // Store the final width
      const finalWidth = previewColumn.offsetWidth;
      if (!layoutContainer.classList.contains('wilco-stacked')) {
        storeWidth(finalWidth);
      }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
      if (layoutContainer.classList.contains('wilco-stacked')) {
        return;
      }
      const currentWidth = getStoredWidth();
      const containerWidth = layoutContainer.offsetWidth;
      const maxWidth = Math.floor(containerWidth * 0.5);
      const cappedWidth = Math.min(currentWidth, maxWidth);
      updateLayoutMode(layoutContainer, previewColumn, cappedWidth);
    });
  }

  /**
   * Update the toggle button icon based on current layout mode.
   */
  function updateToggleIcon(layoutContainer) {
    const toggleBtn = layoutContainer.querySelector('.wilco-layout-toggle');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('i');
    if (!icon) return;

    const isStacked = layoutContainer.classList.contains('wilco-stacked');
    if (isStacked) {
      // In stacked/full-width mode: show compress icon (arrows inward to pin back)
      icon.className = 'fa fa-compress';
      toggleBtn.title = 'Pin to sidebar';
    } else {
      // In sidebar mode: show expand icon (arrows outward to go full width)
      icon.className = 'fa fa-expand';
      toggleBtn.title = 'Expand to full width';
    }
  }

  /**
   * Create the preview panel HTML.
   */
  function createPreviewPanel(productId, layoutContainer) {
    const validateUrl = productId
      ? `/admin/product/${productId}/preview`
      : '/admin/product/preview';

    const panel = document.createElement('div');
    panel.className = 'wilco-preview-panel';

    // Start with expand icon (sidebar mode is default)
    panel.innerHTML = `
      <h4>
        <span>
          <i class="fa fa-eye" style="margin-right: 0.5rem;"></i>
          Live Preview
        </span>
        <button type="button" class="wilco-layout-toggle" title="Expand to full width">
          <i class="fa fa-expand"></i>
        </button>
      </h4>
      <div id="wilco-preview-container"
           data-wilco-component="store:product_preview"
           data-wilco-props="{}"
           data-wilco-api="/api"
           data-wilco-live="true"
           data-wilco-validate-url="${validateUrl}">
        <div style="color: #6c757d; text-align: center; padding: 2rem;">
          Loading preview...
        </div>
      </div>
    `;

    // Add toggle button functionality
    const toggleBtn = panel.querySelector('.wilco-layout-toggle');
    toggleBtn.addEventListener('click', function() {
      const isStacked = layoutContainer.classList.contains('wilco-stacked');
      const previewColumn = layoutContainer.querySelector('.wilco-preview-column');

      if (isStacked) {
        // Switch to sidebar mode: use last saved width or max allowed width
        const containerWidth = layoutContainer.offsetWidth;
        const maxWidth = Math.floor(containerWidth * 0.5);
        const savedWidth = getStoredWidth();
        // Use saved width if it fits, otherwise use max width
        const targetWidth = savedWidth <= maxWidth ? savedWidth : maxWidth;

        layoutContainer.classList.remove('wilco-stacked');
        previewColumn.style.flex = '0 0 ' + targetWidth + 'px';
        storeWidth(targetWidth);
      } else {
        // Switch to stacked mode
        layoutContainer.classList.add('wilco-stacked');
        previewColumn.style.flex = '';
      }

      // Update icon after toggle
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

    // Wait for the form to be rendered
    const checkForm = setInterval(() => {
      // Find the card body that contains the form
      const cardBody = document.querySelector('.card-body');
      if (!cardBody) {
        return;
      }

      // Check if we already injected
      if (document.querySelector('.wilco-layout-container')) {
        clearInterval(checkForm);
        return;
      }

      clearInterval(checkForm);

      // Inject CSS styles
      injectStyles();

      // Create the two-column layout
      const layoutContainer = document.createElement('div');
      layoutContainer.className = 'wilco-layout-container';

      // Create form column and move existing content into it
      const formColumn = document.createElement('div');
      formColumn.className = 'wilco-form-column';

      // Move all existing children of cardBody into formColumn
      while (cardBody.firstChild) {
        formColumn.appendChild(cardBody.firstChild);
      }

      // Create resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'wilco-resize-handle';
      resizeHandle.title = 'Drag to resize preview';

      // Create preview column
      const previewColumn = document.createElement('div');
      previewColumn.className = 'wilco-preview-column';

      const productId = getProductId();
      const panel = createPreviewPanel(productId, layoutContainer);
      previewColumn.appendChild(panel);

      // Assemble the layout: form on left, resize handle, preview on right
      layoutContainer.appendChild(formColumn);
      layoutContainer.appendChild(resizeHandle);
      layoutContainer.appendChild(previewColumn);

      // Add the layout container to the card body
      cardBody.appendChild(layoutContainer);

      // Initialize resize functionality
      initResize(layoutContainer, resizeHandle, previewColumn);

      console.log('Wilco Admin Preview: Resizable two-column layout injected');

      // Load the wilco scripts and render the component
      loadWilcoScripts().then(() => {
        // Wait for wilco to be available and render the container
        waitForWilco(() => {
          const container = document.getElementById('wilco-preview-container');
          if (container && window.wilco && window.wilco.renderComponent) {
            // Read component configuration from data attributes
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

    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkForm), 5000);
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

      // Load the main wilco loader
      if (!document.querySelector('script[src*="loader.js"]')) {
        scriptsToLoad++;
        var loaderScript = document.createElement('script');
        loaderScript.src = '/wilco-static/wilco/loader.js';
        loaderScript.onload = onScriptLoad;
        document.body.appendChild(loaderScript);
      }

      // Load the live loader for Starlette-Admin
      if (!document.querySelector('script[src*="live-loader-starlette.js"]')) {
        scriptsToLoad++;
        var liveLoaderScript = document.createElement('script');
        liveLoaderScript.src = '/static/wilco/live-loader-starlette.js';
        liveLoaderScript.onload = onScriptLoad;
        document.body.appendChild(liveLoaderScript);
      }

      // If no scripts need loading, resolve immediately
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
