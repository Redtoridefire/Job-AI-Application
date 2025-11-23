// Content script - runs on all pages to detect and fill forms

// Allowlist of job application sites
const JOB_SITE_PATTERNS = [
  // Major ATS (Applicant Tracking Systems)
  'workday.com',
  'myworkdayjobs.com',
  'greenhouse.io',
  'greenhouse.com',
  'lever.co',
  'icims.com',
  'smartrecruiters.com',
  'taleo.net',
  'successfactors.com',
  'ultipro.com',
  'jobvite.com',
  'bamboohr.com',
  'workable.com',
  'breezy.hr',
  'recruitee.com',
  'ashbyhq.com',
  'applytojob.com',

  // Job boards
  'indeed.com',
  'linkedin.com',
  'monster.com',
  'glassdoor.com',
  'dice.com',
  'careerbuilder.com',
  'ziprecruiter.com',
  'simplyhired.com',
  'snagajob.com',
  'craigslist.org',

  // Tech-specific
  'angel.co',
  'wellfound.com',
  'stackoverflow.com/jobs',
  'hired.com',
  'otta.com',
  'cord.co',

  // Company career pages (common patterns)
  '/careers',
  '/jobs',
  '/apply',
  '/application',
  '/positions',
  '/opportunities'
];

// Check if current page is a job application site
function isJobApplicationSite() {
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();

  return JOB_SITE_PATTERNS.some(pattern => {
    if (pattern.startsWith('/')) {
      // Path-based pattern
      return url.includes(pattern);
    } else {
      // Domain-based pattern
      return hostname.includes(pattern);
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    // Manual trigger - always fill regardless of allowlist or mode
    console.log('Manual fill triggered from popup');
    fillCurrentForm().then((result) => {
      sendResponse(result);
    });
    return true; // Required for async response
  }

  if (request.action === 'checkSite') {
    // Check if current site is on allowlist
    sendResponse({
      isJobSite: isJobApplicationSite(),
      url: window.location.href,
      hostname: window.location.hostname
    });
    return true;
  }
});

// Track which fields have been filled to avoid duplicate filling
const filledFields = new WeakSet();

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
      // Skip if already filled by us
      if (filledFields.has(field.element)) {
        continue;
      }

      // Skip if field already has a value (user might have filled it)
      if (field.element.value && field.element.value.trim()) {
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, fillSpeed));

      const filled = await fillField(field, data, learnedResponses);
      if (filled) {
        filledCount++;
        filledFields.add(field.element);
      }
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

  // Name fields - expanded patterns
  if (matchesAny(search, [
    'full name', 'your name', 'first name', 'last name', 'legal name',
    'candidate name', 'applicant name', 'given name', 'family name',
    'fname', 'lname', 'firstname', 'lastname', 'name'
  ])) {
    // First name
    if (matchesAny(search, ['first name', 'first_name', 'firstname', 'fname', 'given name', 'given_name'])
        && !matchesAny(search, ['last', 'full', 'family'])) {
      return userData.fullName ? userData.fullName.split(' ')[0] : '';
    }
    // Last name
    if (matchesAny(search, ['last name', 'last_name', 'lastname', 'lname', 'surname', 'family name', 'family_name'])
        && !matchesAny(search, ['first', 'full', 'given'])) {
      return userData.fullName ? userData.fullName.split(' ').slice(-1)[0] : '';
    }
    // Middle name - return empty for now
    if (matchesAny(search, ['middle name', 'middle_name', 'middlename', 'middle initial'])) {
      return '';
    }
    // Full name
    return userData.fullName || '';
  }

  // Email fields - more patterns
  if (matchesAny(search, [
    'email', 'e-mail', 'mail', 'email address', 'e-mail address',
    'contact email', 'your email', 'applicant email'
  ]) || fieldInfo.type === 'email') {
    return userData.email || '';
  }

  // Phone fields - expanded patterns
  if (matchesAny(search, [
    'phone', 'mobile', 'telephone', 'cell', 'phone number',
    'mobile number', 'cell phone', 'contact number', 'tel',
    'primary phone', 'home phone', 'work phone'
  ]) || fieldInfo.type === 'tel') {
    return userData.phone || '';
  }

  // LinkedIn fields
  if (matchesAny(search, [
    'linkedin', 'linked-in', 'linkedin profile', 'linkedin url',
    'linkedin.com', 'social profile', 'professional profile'
  ])) {
    return userData.linkedin || '';
  }

  // Location/Address fields - expanded patterns
  if (matchesAny(search, [
    'city', 'location', 'address', 'where are you', 'where do you live',
    'current location', 'residence', 'living in', 'based in',
    'home address', 'street address', 'mailing address'
  ])) {
    // Skip zip/postal codes
    if (matchesAny(search, ['zip', 'postal', 'postcode', 'zip code'])) return '';
    // State only
    if (matchesAny(search, ['state', 'province', 'region']) && !matchesAny(search, ['city', 'address'])) {
      return userData.location ? userData.location.split(',')[1]?.trim() : '';
    }
    // City only
    if (matchesAny(search, ['city']) && !matchesAny(search, ['state', 'zip'])) {
      return userData.location ? userData.location.split(',')[0]?.trim() : '';
    }
    // Country
    if (matchesAny(search, ['country'])) {
      return 'United States'; // Default - can be customized
    }
    // Full location
    return userData.location || '';
  }

  // Work authorization - expanded patterns
  if (matchesAny(search, [
    'work authorization', 'authorized to work', 'work permit',
    'visa', 'sponsorship', 'legally authorized', 'eligible to work',
    'require sponsorship', 'work eligibility', 'employment authorization',
    'right to work', 'authorized in'
  ])) {
    return userData.workAuth || 'Yes';
  }

  // Job title / position applying for
  if (matchesAny(search, [
    'job title', 'position', 'role', 'position title',
    'desired position', 'applying for', 'job role'
  ])) {
    // Will be filled from learned data if available
    return null;
  }

  // Years of experience
  if (matchesAny(search, [
    'years of experience', 'experience', 'years experience',
    'total experience', 'professional experience'
  ]) && !matchesAny(search, ['describe', 'detail', 'tell us'])) {
    // Return a number if it's a number field
    if (fieldInfo.type === 'number') {
      return null; // Will learn from user
    }
  }

  // Salary expectations
  if (matchesAny(search, [
    'salary', 'compensation', 'expected salary', 'salary expectation',
    'desired salary', 'pay rate', 'hourly rate', 'annual salary'
  ])) {
    return null; // User should fill this manually
  }

  // Start date / availability
  if (matchesAny(search, [
    'start date', 'available to start', 'availability',
    'when can you start', 'earliest start date', 'notice period'
  ])) {
    if (fieldInfo.type === 'date') {
      // Suggest 2 weeks from now
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      return twoWeeks.toISOString().split('T')[0];
    }
    return 'Immediately'; // Or can be learned
  }

  // Yes/No questions - expanded
  if (fieldInfo.type === 'radio' || fieldInfo.type === 'select') {
    // Age verification
    if (matchesAny(search, ['18', 'age', 'years old', 'over 18', 'at least 18'])) {
      return 'yes';
    }
    // Criminal record (usually no)
    if (matchesAny(search, ['criminal', 'convicted', 'felony'])) {
      return 'no';
    }
    // Driver's license
    if (matchesAny(search, ['driver', 'license', 'drive'])) {
      return 'yes'; // Can be customized
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
  if (!learnedResponses || Object.keys(learnedResponses).length === 0) {
    return null;
  }

  // Try exact matches first
  const exactKeys = [
    fieldInfo.id,
    fieldInfo.name
  ].filter(k => k && k.length > 2);

  for (const key of exactKeys) {
    if (learnedResponses[key]) {
      console.log(`Found exact learned match for "${key}": ${learnedResponses[key]}`);
      return learnedResponses[key];
    }
  }

  // Try fuzzy matching based on label and search string
  const searchTerms = [
    fieldInfo.label,
    fieldInfo.placeholder,
    fieldInfo.ariaLabel
  ].filter(term => term && term.length > 3);

  for (const term of searchTerms) {
    const normalizedTerm = term.toLowerCase().trim();

    // Check each learned response
    for (const [learnedKey, learnedValue] of Object.entries(learnedResponses)) {
      const normalizedKey = learnedKey.toLowerCase().trim();

      // Check for similarity
      if (normalizedKey === normalizedTerm ||
          normalizedKey.includes(normalizedTerm) ||
          normalizedTerm.includes(normalizedKey)) {
        console.log(`Found fuzzy learned match for "${term}" -> "${learnedKey}": ${learnedValue}`);
        return learnedValue;
      }
    }
  }

  // Try semantic matching for common patterns
  const search = fieldInfo.searchString.toLowerCase();

  for (const [learnedKey, learnedValue] of Object.entries(learnedResponses)) {
    const keyLower = learnedKey.toLowerCase();

    // Job title matching
    if ((matchesAny(search, ['job title', 'position', 'role']) &&
         matchesAny(keyLower, ['job title', 'position', 'role'])) ||
        (matchesAny(search, ['title']) && matchesAny(keyLower, ['title']))) {
      console.log(`Semantic match for job title: ${learnedValue}`);
      return learnedValue;
    }

    // Experience matching
    if (matchesAny(search, ['years of experience', 'experience years']) &&
        matchesAny(keyLower, ['experience', 'years'])) {
      console.log(`Semantic match for experience: ${learnedValue}`);
      return learnedValue;
    }

    // Salary matching
    if (matchesAny(search, ['salary', 'compensation']) &&
        matchesAny(keyLower, ['salary', 'compensation', 'pay'])) {
      console.log(`Semantic match for salary: ${learnedValue}`);
      return learnedValue;
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
chrome.storage.local.get(['autoFillEnabled', 'autoFillMode'], (data) => {
  // Check if we should auto-fill
  const autoFillMode = data.autoFillMode || 'manual'; // Default to manual
  const isJobSite = isJobApplicationSite();

  console.log(`[Smart Autofill] Mode: ${autoFillMode}, Job site: ${isJobSite}, URL: ${window.location.href}`);

  // Only auto-fill if:
  // 1. Auto-fill is enabled
  // 2. Mode is set to 'automatic'
  // 3. Current site is on the allowlist
  if (data.autoFillEnabled && autoFillMode === 'automatic' && isJobSite) {
    console.log('[Smart Autofill] Automatic mode enabled on job site - will auto-fill');
    // Wait for page to fully load
    if (document.readyState === 'complete') {
      setTimeout(() => autoFillOnLoad(), 2000); // Wait 2s for dynamic content
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => autoFillOnLoad(), 2000);
      });
    }
  } else if (data.autoFillEnabled && autoFillMode === 'manual') {
    console.log('[Smart Autofill] Manual mode - waiting for button click');
  } else if (data.autoFillEnabled && !isJobSite) {
    console.log('[Smart Autofill] Not a job application site - skipping auto-fill');
  }
});

// Check if page has forms and automatically fill them
async function autoFillOnLoad() {
  const forms = document.querySelectorAll('form');
  const inputs = document.querySelectorAll('input, textarea, select');

  if (forms.length > 0 || inputs.length > 0) {
    console.log(`[Smart Autofill] Found ${forms.length} form(s) and ${inputs.length} field(s) - auto-filling...`);
    await fillCurrentForm();

    // After filling, check if we should auto-navigate
    setTimeout(() => checkAutoNavigation(), 1000);
  }
}

// Dynamic form detection - watch for forms added after page load
chrome.storage.local.get(['autoFillEnabled', 'autoFillMode'], (data) => {
  const autoFillMode = data.autoFillMode || 'manual';
  const isJobSite = isJobApplicationSite();

  // Only enable dynamic detection if in automatic mode and on job site
  if (data.autoFillEnabled && autoFillMode === 'automatic' && isJobSite) {
    initDynamicFormDetection();
  }
});

function initDynamicFormDetection() {
  let formCheckTimeout;
  let lastFieldCount = 0;
  let fillAttempts = 0;
  const maxFillAttempts = 3; // Limit fills per page to avoid loops

  const observer = new MutationObserver((mutations) => {
    // Debounce - only check after mutations stop for 1 second
    clearTimeout(formCheckTimeout);
    formCheckTimeout = setTimeout(async () => {
      // Don't attempt too many fills on the same page
      if (fillAttempts >= maxFillAttempts) {
        return;
      }

      const newInputs = document.querySelectorAll('input, textarea, select');
      const emptyFields = Array.from(newInputs).filter(input =>
        !input.value || !input.value.trim()
      );

      // Only try to fill if there are new empty fields
      if (emptyFields.length > 0 && emptyFields.length !== lastFieldCount) {
        console.log(`Detected ${emptyFields.length} empty fields - attempting auto-fill...`);
        lastFieldCount = emptyFields.length;
        fillAttempts++;

        await fillCurrentForm();
        setTimeout(() => checkAutoNavigation(), 1000);
      }
    }, 1000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('Dynamic form detection enabled');
}

// Auto-navigation - find and click continue/next buttons
async function checkAutoNavigation() {
  const data = await chrome.storage.local.get(['autoNavigate']);

  // Only auto-navigate if explicitly enabled (default off for safety)
  if (!data.autoNavigate) {
    return;
  }

  // Find buttons that might be "continue" or "next" buttons
  const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]');

  for (const button of buttons) {
    const text = (button.textContent || button.value || '').toLowerCase().trim();
    const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
    const buttonText = text + ' ' + ariaLabel;

    // Check if this is a continue/next/save button
    if (matchesAny(buttonText, [
      'continue', 'next', 'save and continue', 'save & continue',
      'submit', 'proceed', 'move forward', 'go to next',
      'save and next', 'save & next'
    ])) {
      // Skip if it's a "cancel" or "back" button
      if (matchesAny(buttonText, ['cancel', 'back', 'previous', 'skip'])) {
        continue;
      }

      console.log(`Found navigation button: "${text}" - clicking...`);

      // Highlight button before clicking
      button.style.outline = '3px solid #10b981';

      setTimeout(() => {
        button.click();
      }, 500);

      return;
    }
  }

  console.log('No navigation button found');
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

  let learnedCount = 0;

  fields.forEach(field => {
    if (field.value && field.value.trim()) {
      const fieldInfo = getFieldInfo(field);

      // Use multiple keys for better matching later
      const keys = [];

      if (fieldInfo.name && fieldInfo.name.length > 2) {
        keys.push(fieldInfo.name);
      }
      if (fieldInfo.id && fieldInfo.id.length > 2) {
        keys.push(fieldInfo.id);
      }
      if (fieldInfo.label && fieldInfo.label.length > 3) {
        keys.push(fieldInfo.label.trim());
      }

      // Store under all possible keys
      keys.forEach(key => {
        learnedResponses[key] = field.value;
        learnedCount++;
      });
    }
  });

  if (learnedCount > 0) {
    await chrome.storage.local.set({ learnedResponses });
    console.log(`Learned ${learnedCount} field(s) from form submission`);
  }
}

async function learnFromField(field) {
  if (!field.value || !field.value.trim()) return;

  const fieldInfo = getFieldInfo(field);

  // Build learning keys
  const keys = [];
  if (fieldInfo.name && fieldInfo.name.length > 2) keys.push(fieldInfo.name);
  if (fieldInfo.id && fieldInfo.id.length > 2) keys.push(fieldInfo.id);
  if (fieldInfo.label && fieldInfo.label.length > 3) keys.push(fieldInfo.label.trim());

  if (keys.length === 0) return;

  const learnedData = await chrome.storage.local.get(['learnedResponses']);
  const learnedResponses = learnedData.learnedResponses || {};

  // Store under all keys
  keys.forEach(key => {
    learnedResponses[key] = field.value;
  });

  await chrome.storage.local.set({ learnedResponses });

  console.log(`Learned: ${keys[0]} = ${field.value} (${keys.length} key(s))`);
}

console.log('Smart Job Autofill extension loaded');
