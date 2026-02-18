/**
 * Wilco Live Preview Loader for Flask-Admin
 *
 * This script adds live preview functionality to wilco components
 * within Flask-Admin edit forms.
 *
 * Features:
 * - Debounced form validation on input
 * - Real-time component preview updates
 * - Validation error display
 */

(function() {
  'use strict';

  // Configuration
  var DEBOUNCE_DELAY = 300; // milliseconds

  // Track debounce timers per container
  var debounceTimers = new WeakMap();

  /**
   * Get all form data from the Flask-Admin form.
   */
  function getFormData() {
    var form = document.querySelector('form');
    if (!form) {
      console.warn('Wilco Live Preview: Could not find form');
      return null;
    }

    var formData = new FormData(form);
    var data = {};

    for (var pair of formData.entries()) {
      var key = pair[0];
      var value = pair[1];
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
    var errorHtml = '<div class="wilco-preview-error" style="' +
      'background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; ' +
      'padding: 1rem; margin-bottom: 1rem; color: #856404;">' +
      '<strong>Preview validation errors:</strong><ul style="margin: 0.5rem 0 0 1rem; padding: 0;">';

    for (var field in errors) {
      if (errors.hasOwnProperty(field)) {
        var fieldErrors = errors[field];
        var errorMessages = Array.isArray(fieldErrors) ? fieldErrors.join(', ') : fieldErrors;
        errorHtml += '<li><strong>' + field + ':</strong> ' + errorMessages + '</li>';
      }
    }

    errorHtml += '</ul></div>';

    var errorContainer = container.parentElement.querySelector('.wilco-preview-error');
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
    var errorContainer = container.parentElement.querySelector('.wilco-preview-error');
    if (errorContainer) {
      errorContainer.remove();
    }
  }

  /**
   * Apply validated props to the component, retrying if the component hasn't loaded yet.
   */
  function applyProps(container, props, retries) {
    retries = retries || 0;

    if (window.wilco && window.wilco.updateComponentProps) {
      var updated = window.wilco.updateComponentProps(container, props);
      if (!updated && retries < 20) {
        setTimeout(function() { applyProps(container, props, retries + 1); }, 200);
      }
    } else {
      container.dataset.wilcoProps = JSON.stringify(props);
      if (window.wilco && window.wilco.renderComponent) {
        window.wilco.renderComponent(container);
      }
    }
  }

  /**
   * Validate form and update preview.
   */
  function validateAndUpdate(container) {
    var validateUrl = container.dataset.wilcoValidateUrl;
    if (!validateUrl) {
      console.warn('Wilco Live Preview: No validate URL found');
      return;
    }

    var formData = getFormData();
    if (!formData) {
      return;
    }

    var body = new URLSearchParams(formData).toString();

    fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Validation request failed: ' + response.status);
      }
      return response.json();
    })
    .then(function(result) {
      if (result.success) {
        clearValidationError(container);
        applyProps(container, result.props);
      } else {
        showValidationError(container, result.errors);
      }
    })
    .catch(function(error) {
      console.error('Wilco Live Preview: Validation failed', error);
      showValidationError(container, { '_error': [error.message] });
    });
  }

  /**
   * Debounced validation trigger.
   */
  function scheduleValidation(container) {
    var existingTimer = debounceTimers.get(container);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    var timer = setTimeout(function() {
      validateAndUpdate(container);
    }, DEBOUNCE_DELAY);

    debounceTimers.set(container, timer);
  }

  /**
   * Handle input event on form fields.
   */
  function handleFieldInput(event) {
    var field = event.target;

    if (!field.matches('input, select, textarea')) {
      return;
    }

    var containers = document.querySelectorAll('[data-wilco-live="true"]');
    containers.forEach(function(container) {
      scheduleValidation(container);
    });
  }

  /**
   * Initialize live preview functionality.
   */
  function initLivePreview() {
    var containers = document.querySelectorAll('[data-wilco-live="true"]');

    if (containers.length === 0) {
      return;
    }

    console.log('Wilco Live Preview: Initializing with', containers.length, 'container(s)');

    document.addEventListener('input', handleFieldInput, true);
    document.addEventListener('change', handleFieldInput, true);

    containers.forEach(function(container) {
      validateAndUpdate(container);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLivePreview);
  } else {
    setTimeout(initLivePreview, 100);
  }

})();
