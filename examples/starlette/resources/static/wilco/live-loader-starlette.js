/**
 * Wilco Live Preview Loader for Starlette-Admin
 *
 * This script adds live preview functionality to wilco components
 * within Starlette-Admin edit forms.
 *
 * Features:
 * - Debounced form validation on input
 * - Real-time component preview updates
 * - Validation error display
 */

(function() {
  'use strict';

  // Configuration
  const DEBOUNCE_DELAY = 300; // milliseconds

  // Track debounce timers per container
  const debounceTimers = new WeakMap();

  /**
   * Get all form data from the Starlette-Admin form.
   */
  function getFormData() {
    // Starlette-Admin uses a form inside the card
    const form = document.querySelector('form');
    if (!form) {
      console.warn('Wilco Live Preview: Could not find form');
      return null;
    }

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
      // Skip CSRF token and special fields
      if (key.startsWith('csrf') || key.startsWith('_')) {
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
    let errorHtml = '<div class="wilco-preview-error" style="' +
      'background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; ' +
      'padding: 1rem; margin-bottom: 1rem; color: #856404;">' +
      '<strong>Preview validation errors:</strong><ul style="margin: 0.5rem 0 0 1rem; padding: 0;">';

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
      // Build form body
      const body = new URLSearchParams(formData).toString();

      // Make validation request
      const response = await fetch(validateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });

      if (!response.ok) {
        throw new Error('Validation request failed: ' + response.status);
      }

      const result = await response.json();

      if (result.success) {
        // Clear any previous errors
        clearValidationError(container);

        // Update component with new props
        if (window.wilco && window.wilco.updateComponentProps) {
          window.wilco.updateComponentProps(container, result.props);
        } else {
          // Fallback: update data attribute and trigger re-render
          container.dataset.wilcoProps = JSON.stringify(result.props);
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
   * Handle input event on form fields.
   */
  function handleFieldInput(event) {
    const field = event.target;

    // Only handle form inputs
    if (!field.matches('input, select, textarea')) {
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

    console.log('Wilco Live Preview: Initializing with', containers.length, 'container(s)');

    // Listen for input events on form fields (debounced)
    document.addEventListener('input', handleFieldInput, true);

    // Also listen for change events (for selects and checkboxes)
    document.addEventListener('change', handleFieldInput, true);

    // Initial validation to show current state
    containers.forEach(function(container) {
      validateAndUpdate(container);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLivePreview);
  } else {
    // Small delay to ensure wilco loader has initialized
    setTimeout(initLivePreview, 100);
  }

})();
