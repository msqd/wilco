/**
 * Wilco Live Preview Loader
 *
 * This script adds live preview functionality to wilco components.
 * It listens for blur events on form fields and validates/updates
 * the component preview when fields lose focus.
 *
 * Features:
 * - Debounced form validation
 * - Client-side image preview using blob URLs (before upload)
 * - Validation error display
 */

(function() {
  'use strict';

  // Configuration
  const DEBOUNCE_DELAY = 300; // milliseconds

  // Track debounce timers per container
  const debounceTimers = new WeakMap();

  // Track blob URLs for file inputs (field name -> blob URL)
  // This allows previewing images before they're uploaded to the server
  const fileBlobUrls = new Map();

  /**
   * Get all form data from the Django admin form.
   */
  function getFormData() {
    const form = document.querySelector('#content-main form');
    if (!form) {
      console.warn('Wilco Live Preview: Could not find admin form');
      return null;
    }

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      // Skip CSRF token and other special fields
      if (key.startsWith('csrfmiddleware') || key.startsWith('_')) {
        continue;
      }
      data[key] = value;
    }

    return data;
  }

  /**
   * Show validation error on the preview container.
   */
  function showValidationError(container, errors) {
    // Create error message
    let errorHtml = '<div class="wilco-preview-error" style="' +
      'background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; ' +
      'padding: 1rem; margin-bottom: 1rem; color: #856404;">' +
      '<strong>Could not update preview due to validation errors:</strong><ul style="margin: 0.5rem 0 0 1rem; padding: 0;">';

    for (const [field, fieldErrors] of Object.entries(errors)) {
      const errorMessages = Array.isArray(fieldErrors) ? fieldErrors.join(', ') : fieldErrors;
      errorHtml += '<li><strong>' + field + ':</strong> ' + errorMessages + '</li>';
    }

    errorHtml += '</ul></div>';

    // Find or create error container
    let errorContainer = container.parentElement.querySelector('.wilco-preview-error');
    if (errorContainer) {
      errorContainer.outerHTML = errorHtml;
    } else {
      container.insertAdjacentHTML('beforebegin', errorHtml);
    }
  }

  /**
   * Clear validation errors from the preview container.
   */
  function clearValidationError(container) {
    const errorContainer = container.parentElement.querySelector('.wilco-preview-error');
    if (errorContainer) {
      errorContainer.remove();
    }
  }

  /**
   * Apply blob URLs to props for client-side image preview.
   *
   * Maps file input field names to prop names using convention:
   * - "image" field -> "imageUrl" prop
   * - "photo" field -> "photoUrl" prop
   * - "avatar" field -> "avatarUrl" prop
   * - etc.
   */
  function applyBlobUrlsToProps(props) {
    for (const [fieldName, blobUrl] of fileBlobUrls.entries()) {
      // Convert field name to prop name (e.g., "image" -> "imageUrl")
      const propName = fieldName + 'Url';

      // Override the prop with the blob URL
      props[propName] = blobUrl;
    }
    return props;
  }

  /**
   * Handle file input change - create blob URL for preview.
   */
  function handleFileInputChange(event) {
    const input = event.target;
    if (input.type !== 'file') return;

    const fieldName = input.name;
    const file = input.files && input.files[0];

    // Revoke previous blob URL to free memory
    const previousUrl = fileBlobUrls.get(fieldName);
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
      fileBlobUrls.delete(fieldName);
    }

    // Create new blob URL if a file is selected
    if (file && file.type.startsWith('image/')) {
      const blobUrl = URL.createObjectURL(file);
      fileBlobUrls.set(fieldName, blobUrl);
      console.log('Wilco Live Preview: Created blob URL for', fieldName);
    }

    // Trigger validation to update preview
    const containers = document.querySelectorAll('[data-wilco-live="true"]');
    containers.forEach(function(container) {
      scheduleValidation(container);
    });
  }

  /**
   * Validate form and update preview.
   */
  async function validateAndUpdate(container) {
    const validateUrl = container.dataset.wilcoValidateUrl;
    if (!validateUrl) {
      console.warn('Wilco Live Preview: No validate URL found');
      return;
    }

    const formData = getFormData();
    if (!formData) {
      return;
    }

    try {
      // Get CSRF token
      const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken.value;
      }

      // Build form body
      const body = new URLSearchParams(formData).toString();

      // Make validation request
      const response = await fetch(validateUrl, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        throw new Error('Validation request failed: ' + response.status);
      }

      const result = await response.json();

      if (result.success) {
        // Clear any previous errors
        clearValidationError(container);

        // Apply blob URLs for client-side image preview
        const props = applyBlobUrlsToProps(result.props);

        // Update component with new props
        if (window.wilco && window.wilco.updateComponentProps) {
          window.wilco.updateComponentProps(container, props);
        } else {
          // Fallback: update data attribute and trigger re-render
          container.dataset.wilcoProps = JSON.stringify(props);
          if (window.wilco && window.wilco.renderComponent) {
            window.wilco.renderComponent(container);
          }
        }
      } else {
        // Show validation errors
        showValidationError(container, result.errors);
      }

    } catch (error) {
      console.error('Wilco Live Preview: Validation failed', error);
      showValidationError(container, { '_error': [error.message] });
    }
  }

  /**
   * Debounced validation trigger.
   */
  function scheduleValidation(container) {
    // Clear any existing timer
    const existingTimer = debounceTimers.get(container);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new validation
    const timer = setTimeout(function() {
      validateAndUpdate(container);
    }, DEBOUNCE_DELAY);

    debounceTimers.set(container, timer);
  }

  /**
   * Handle blur event on form fields.
   */
  function handleFieldBlur(event) {
    const field = event.target;

    // Only handle form inputs (but not file inputs - they use change event)
    if (!field.matches('input, select, textarea') || field.type === 'file') {
      return;
    }

    // Find all live preview containers
    const containers = document.querySelectorAll('[data-wilco-live="true"]');
    containers.forEach(function(container) {
      scheduleValidation(container);
    });
  }

  /**
   * Initialize live preview functionality.
   */
  function initLivePreview() {
    // Find all live preview containers
    const containers = document.querySelectorAll('[data-wilco-live="true"]');

    if (containers.length === 0) {
      return;
    }

    // Find the admin form
    const form = document.querySelector('#content-main form');
    if (!form) {
      console.warn('Wilco Live Preview: Could not find admin form');
      return;
    }

    // Listen for blur events on the form (uses event delegation)
    form.addEventListener('blur', handleFieldBlur, true);

    // Listen for change events on select and file inputs
    form.addEventListener('change', function(event) {
      const target = event.target;

      // Handle file inputs specially
      if (target.type === 'file') {
        handleFileInputChange(event);
        return;
      }

      // Handle select elements
      if (target.matches('select')) {
        containers.forEach(function(container) {
          scheduleValidation(container);
        });
      }
    });

    console.log('Wilco Live Preview: Initialized for', containers.length, 'container(s)');
  }

  /**
   * Cleanup blob URLs when page unloads.
   */
  function cleanup() {
    for (const blobUrl of fileBlobUrls.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    fileBlobUrls.clear();
  }

  // Extend the wilco API with live preview functions
  if (window.wilco) {
    window.wilco.validateAndUpdate = validateAndUpdate;
    window.wilco.showValidationError = showValidationError;
    window.wilco.clearValidationError = clearValidationError;
  }

  // Cleanup on page unload
  window.addEventListener('unload', cleanup);

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLivePreview);
  } else {
    initLivePreview();
  }
})();
