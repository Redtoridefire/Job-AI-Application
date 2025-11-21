// Injected script - runs in the page context (not the extension context)
// This can be used for interacting with page-level JavaScript if needed

(function() {
  'use strict';
  
  // This script has access to the page's JavaScript context
  // Useful for interacting with frameworks like React, Angular, or custom form libraries
  
  console.log('Smart Autofill injected script loaded');
  
  // Helper function to trigger React/Vue events properly
  window.triggerReactChange = function(element, value) {
    // For React 16+
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    
    nativeInputValueSetter.call(element, value);
    
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  };
  
  // Helper to detect if page uses React
  window.detectReact = function() {
    return !!(
      document.querySelector('[data-reactroot]') ||
      document.querySelector('[data-reactid]') ||
      window.React ||
      Array.from(document.querySelectorAll('*')).some(
        el => Object.keys(el).some(key => key.startsWith('__react'))
      )
    );
  };
  
  // Helper to detect if page uses Angular
  window.detectAngular = function() {
    return !!(window.angular || document.querySelector('[ng-app]'));
  };
  
  // Helper to detect if page uses Vue
  window.detectVue = function() {
    return !!(window.Vue || document.querySelector('[data-v-]'));
  };
  
  // Notify content script that injected script is ready
  window.postMessage({ type: 'SMART_AUTOFILL_READY' }, '*');
  
})();
