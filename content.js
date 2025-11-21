// Content script - runs on all pages to detect and fill forms

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    fillCurrentForm().then((result) => {
      sendResponse(result);
    });
    return true; // Required for async response
  }
});

// Main form filling function
async function fillCurrentForm() {
  try {
    // Get user data and settings from storage
    const data = await chrome.storage.local.get([
      'fullName', 'email', 'phone', 'linkedin', 'location',
      'resumeData', 'learnedResponses', 'fillSpeed', 
      'autoFillEnabled', 'learnMode', 'smartMode', 'workAuth'
    ]);

    if (!data.autoFillEnabled) {
      return { success: false, message: 'Auto-fill is disabled' };
    }

    const fillSpeed = data.fillSpeed || 500;
    const learnedResponses = data.learnedResponses || {};
    
    // Find all form fields
    const fields = findFormFields();
    
    let filledCount = 0;

    for (const field of fields) {
      await new Promise(resolve => setTimeout(resolve, fillSpeed));
      
      const filled = await fillField(field, data, learnedResponses);
      if (filled) filledCount++;
    }

    console.log(`Auto-filled ${filledCount} fields`);
    return { success: true, fieldsF: filledCount };
  } catch (error) {
    console.error('Error filling form:', error);
    return { success: false, message: error.message };
  }
}

// Find all form fields on the page
function findFormFields() {
  const fields = [];
  
  // Text inputs, email, tel, url
  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input:not([type])');
  inputs.forEach(input => {
    if (isVisible(input) && !input.disabled && !input.readOnly) {
      fields.push({ element: input, type: 'input' });
    }
  });

  // Textareas
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    if (isVisible(textarea) && !textarea.disabled && !textarea.readOnly) {
      fields.push({ element: textarea, type: 'textarea' });
    }
  });

  // Select dropdowns
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    if (isVisible(select) && !select.disabled) {
      fields.push({ element: select, type: 'select' });
    }
  });

  // Radio buttons
  const radios = document.querySelectorAll('input[type="radio"]');
  radios.forEach(radio => {
    if (isVisible(radio) && !radio.disabled) {
      fields.push({ element: radio, type: 'radio' });
    }
  });

  // Checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    if (isVisible(checkbox) && !checkbox.disabled) {
      fields.push({ element: checkbox, type: 'checkbox' });
    }
  });

  return fields;
}

// Check if element is visible
function isVisible(element) {
  return element.offsetWidth > 0 && 
         element.offsetHeight > 0 && 
         window.getComputedStyle(element).visibility !== 'hidden' &&
         window.getComputedStyle(element).display !== 'none';
}

// Fill a single field
async function fillField(field, userData, learnedResponses) {
  const element = field.element;
  const fieldInfo = getFieldInfo(element);
  
  // Check if we've learned a response for this field
  const learnedValue = findLearnedResponse(fieldInfo, learnedResponses);
  if (learnedValue) {
    return setFieldValue(field, learnedValue);
  }

  // Use smart matching to fill the field
  const value = smartMatch(fieldInfo, userData);
  if (value) {
    return setFieldValue(field, value);
  }

  return false;
}

// Get information about a field
function getFieldInfo(element) {
  const info = {
    id: element.id || '',
    name: element.name || '',
    placeholder: element.placeholder || '',
    ariaLabel: element.getAttribute('aria-label') || '',
    type: element.type || 'text',
    tagName: element.tagName.toLowerCase()
  };

  // Get label text
  const label = findLabel(element);
  if (label) {
    info.label = label.textContent.trim();
  }

  // Get nearby text
  info.nearbyText = getNearbyText(element);

  // Create a combined search string
  info.searchString = [
    info.id, info.name, info.placeholder, 
    info.ariaLabel, info.label, info.nearbyText
  ].join(' ').toLowerCase();

  return info;
}

// Find label for an element
function findLabel(element) {
  // Check for label with 'for' attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label;
  }

  // Check if element is inside a label
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName === 'LABEL') return parent;
    parent = parent.parentElement;
  }

  // Check for nearby label (previous sibling)
  let sibling = element.previousElementSibling;
  if (sibling && sibling.tagName === 'LABEL') return sibling;

  return null;
}

// Get nearby text content
function getNearbyText(element) {
  const texts = [];
  
  // Check parent's text
  if (element.parentElement) {
    const parentText = element.parentElement.textContent;
    if (parentText && parentText.length < 200) {
      texts.push(parentText);
    }
  }

  return texts.join(' ').trim();
}

// Smart matching algorithm
function smartMatch(fieldInfo, userData) {
  const search = fieldInfo.searchString;

  // Name fields
  if (matchesAny(search, ['full name', 'your name', 'first name', 'last name', 'legal name', 'candidate name'])) {
    if (matchesAny(search, ['first name', 'first_name', 'firstname']) && !matchesAny(search, ['last', 'full'])) {
      return userData.fullName ? userData.fullName.split(' ')[0] : '';
    }
    if (matchesAny(search, ['last name', 'last_name', 'lastname', 'surname']) && !matchesAny(search, ['first', 'full'])) {
      return userData.fullName ? userData.fullName.split(' ').slice(-1)[0] : '';
    }
    return userData.fullName || '';
  }

  // Email fields
  if (matchesAny(search, ['email', 'e-mail', 'mail']) && fieldInfo.type === 'email') {
    return userData.email || '';
  }

  // Phone fields
  if (matchesAny(search, ['phone', 'mobile', 'telephone', 'cell']) && 
      (fieldInfo.type === 'tel' || matchesAny(search, ['number']))) {
    return userData.phone || '';
  }

  // LinkedIn fields
  if (matchesAny(search, ['linkedin', 'linked-in', 'linkedin profile', 'linkedin url'])) {
    return userData.linkedin || '';
  }

  // Location/Address fields
  if (matchesAny(search, ['city', 'location', 'address', 'where are you', 'where do you live'])) {
    if (matchesAny(search, ['zip', 'postal'])) return '';
    if (matchesAny(search, ['state'])) return userData.location ? userData.location.split(',')[1]?.trim() : '';
    return userData.location || '';
  }

  // Work authorization
  if (matchesAny(search, ['work authorization', 'authorized to work', 'work permit', 'visa', 'sponsorship', 'legally authorized'])) {
    return userData.workAuth || '';
  }

  // Yes/No questions - commonly answered "Yes"
  if (fieldInfo.type === 'radio' || fieldInfo.type === 'select') {
    // Are you 18 or older?
    if (matchesAny(search, ['18', 'age', 'years old', 'over 18'])) {
      return 'yes';
    }
  }

  return null;
}

// Check if search string matches any of the patterns
function matchesAny(searchString, patterns) {
  return patterns.some(pattern => searchString.includes(pattern.toLowerCase()));
}

// Find learned response for a field
function findLearnedResponse(fieldInfo, learnedResponses) {
  // Create a key from field info
  const possibleKeys = [
    fieldInfo.id,
    fieldInfo.name,
    fieldInfo.label,
    fieldInfo.searchString.substring(0, 100)
  ].filter(k => k && k.length > 3);

  for (const key of possibleKeys) {
    if (learnedResponses[key]) {
      return learnedResponses[key];
    }
  }

  return null;
}

// Set field value
function setFieldValue(field, value) {
  const element = field.element;

  try {
    if (field.type === 'input' || field.type === 'textarea') {
      // For text inputs and textareas
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      highlightField(element);
      return true;
    } else if (field.type === 'select') {
      // For select dropdowns
      const option = findBestOption(element, value);
      if (option) {
        element.value = option.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        highlightField(element);
        return true;
      }
    } else if (field.type === 'radio') {
      // For radio buttons
      if (shouldSelectRadio(element, value)) {
        element.checked = true;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        highlightField(element);
        return true;
      }
    } else if (field.type === 'checkbox') {
      // For checkboxes (e.g., terms and conditions)
      if (shouldCheckBox(element)) {
        element.checked = true;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        highlightField(element);
        return true;
      }
    }
  } catch (error) {
    console.error('Error setting field value:', error);
  }

  return false;
}

// Find best matching option in a select dropdown
function findBestOption(selectElement, value) {
  const options = Array.from(selectElement.options);
  const valueLower = value.toString().toLowerCase();

  // Try exact match first
  for (const option of options) {
    if (option.value.toLowerCase() === valueLower || 
        option.textContent.toLowerCase() === valueLower) {
      return option;
    }
  }

  // Try partial match
  for (const option of options) {
    if (option.value.toLowerCase().includes(valueLower) || 
        option.textContent.toLowerCase().includes(valueLower) ||
        valueLower.includes(option.textContent.toLowerCase())) {
      return option;
    }
  }

  return null;
}

// Determine if radio button should be selected
function shouldSelectRadio(radioElement, value) {
  const label = findLabel(radioElement);
  const labelText = label ? label.textContent.toLowerCase() : '';
  const radioValue = radioElement.value.toLowerCase();

  const valueLower = value.toString().toLowerCase();

  return labelText.includes(valueLower) || 
         radioValue.includes(valueLower) ||
         valueLower.includes(labelText) ||
         valueLower.includes(radioValue);
}

// Determine if checkbox should be checked
function shouldCheckBox(checkboxElement) {
  const fieldInfo = getFieldInfo(checkboxElement);
  const search = fieldInfo.searchString;

  // Don't auto-check terms and conditions or agreements
  if (matchesAny(search, ['agree', 'terms', 'condition', 'privacy policy', 'consent'])) {
    return false;
  }

  return false; // Conservative approach - don't check unless explicitly learned
}

// Highlight field to show it was filled
function highlightField(element) {
  const originalBackground = element.style.background;
  element.style.background = '#d1fae5';
  element.style.transition = 'background 0.5s ease';
  
  setTimeout(() => {
    element.style.background = originalBackground;
  }, 1000);
}

// Auto-fill on page load (if enabled)
chrome.storage.local.get(['autoFillEnabled'], (data) => {
  if (data.autoFillEnabled) {
    // Wait for page to fully load
    if (document.readyState === 'complete') {
      checkForForms();
    } else {
      window.addEventListener('load', checkForForms);
    }
  }
});

// Check if page has forms and show subtle indicator
function checkForForms() {
  const forms = document.querySelectorAll('form');
  if (forms.length > 0) {
    console.log(`Found ${forms.length} form(s) on this page`);
  }
}

// Learning mode - observe user interactions to learn preferences
chrome.storage.local.get(['learnMode'], async (data) => {
  if (data.learnMode) {
    initLearningMode();
  }
});

function initLearningMode() {
  // Listen for form submissions to learn from user choices
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    await learnFromForm(form);
  }, true);

  // Listen for significant changes (after user has been idle for a moment)
  let changeTimeout;
  document.addEventListener('change', (e) => {
    clearTimeout(changeTimeout);
    changeTimeout = setTimeout(async () => {
      await learnFromField(e.target);
    }, 2000);
  }, true);
}

async function learnFromForm(form) {
  const fields = form.querySelectorAll('input, select, textarea');
  const learnedData = await chrome.storage.local.get(['learnedResponses']);
  const learnedResponses = learnedData.learnedResponses || {};

  fields.forEach(field => {
    if (field.value && field.value.trim()) {
      const fieldInfo = getFieldInfo(field);
      const key = fieldInfo.name || fieldInfo.id || fieldInfo.label;
      
      if (key && key.length > 3) {
        learnedResponses[key] = field.value;
      }
    }
  });

  await chrome.storage.local.set({ learnedResponses });
  console.log('Learned from form submission');
}

async function learnFromField(field) {
  if (!field.value || !field.value.trim()) return;

  const fieldInfo = getFieldInfo(field);
  const key = fieldInfo.name || fieldInfo.id || fieldInfo.label;
  
  if (!key || key.length < 3) return;

  const learnedData = await chrome.storage.local.get(['learnedResponses']);
  const learnedResponses = learnedData.learnedResponses || {};
  
  learnedResponses[key] = field.value;
  await chrome.storage.local.set({ learnedResponses });
  
  console.log(`Learned: ${key} = ${field.value}`);
}

console.log('Smart Job Autofill extension loaded');
