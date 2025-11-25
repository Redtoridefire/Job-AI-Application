// Content script - runs on all pages to detect and fill forms

// Default allowlist of job application sites
const DEFAULT_JOB_SITE_PATTERNS = [
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
async function isJobApplicationSite() {
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();

  // Get user's custom allowed sites
  const data = await chrome.storage.local.get(['allowedSites', 'disabledDefaultSites']);
  const customSites = data.allowedSites || [];
  const disabledSites = data.disabledDefaultSites || [];

  // Combine default patterns (minus disabled ones) with custom sites
  const enabledDefaults = DEFAULT_JOB_SITE_PATTERNS.filter(
    pattern => !disabledSites.includes(pattern)
  );
  const allPatterns = [...enabledDefaults, ...customSites];

  return allPatterns.some(pattern => {
    if (pattern.startsWith('/')) {
      // Path-based pattern
      return url.includes(pattern);
    } else {
      // Domain-based pattern
      return hostname.includes(pattern);
    }
  });
}

// Export default patterns for use in popup
if (typeof window !== 'undefined') {
  window.DEFAULT_JOB_SITE_PATTERNS = DEFAULT_JOB_SITE_PATTERNS;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    // Manual trigger - always fill regardless of settings
    console.log('[Smart Autofill] Manual fill triggered from popup');
    fillCurrentForm(true).then((result) => { // Pass true for manual mode
      console.log('[Smart Autofill] Manual fill result:', result);
      sendResponse(result);
    });
    return true; // Required for async response
  }

  if (request.action === 'checkSite') {
    // Check if current site is on allowlist
    isJobApplicationSite().then(isJobSite => {
      sendResponse({
        isJobSite,
        url: window.location.href,
        hostname: window.location.hostname
      });
    });
    return true; // Required for async response
  }

  if (request.action === 'getDefaultSites') {
    // Return default site patterns for popup
    sendResponse({ defaultSites: DEFAULT_JOB_SITE_PATTERNS });
    return true;
  }
});

// Track which fields have been filled to avoid duplicate filling
const filledFields = new WeakSet();

// Main form filling function
async function fillCurrentForm(isManualTrigger = false) {
  try {
    console.log('[Smart Autofill] ===== STARTING FORM FILL =====');
    console.log('[Smart Autofill] Manual trigger:', isManualTrigger);
    console.log('[Smart Autofill] Page URL:', window.location.href);

    // Get user data and settings from storage
    const data = await chrome.storage.local.get([
      'fullName', 'email', 'phone', 'linkedin', 'location',
      'resumeData', 'learnedResponses', 'fillSpeed',
      'autoFillEnabled', 'learnMode', 'smartMode', 'workAuth'
    ]);

    console.log('[Smart Autofill] User data loaded:', {
      fullName: data.fullName || '(not set)',
      email: data.email || '(not set)',
      phone: data.phone || '(not set)',
      linkedin: data.linkedin || '(not set)',
      location: data.location || '(not set)',
      hasResumeData: !!data.resumeData,
      learnedCount: Object.keys(data.learnedResponses || {}).length,
      workAuth: data.workAuth || '(not set)'
    });

    // Check if user has ANY profile data
    const hasAnyData = data.fullName || data.email || data.phone || data.linkedin || data.location;
    if (!hasAnyData) {
      console.error('[Smart Autofill] ❌ No profile data found!');
      return {
        success: false,
        message: 'No profile data saved. Please fill out your profile in the extension settings first.'
      };
    }

    // Only check autoFillEnabled for automatic fills, not manual triggers
    if (!isManualTrigger && !data.autoFillEnabled) {
      console.log('[Smart Autofill] Auto-fill is disabled (automatic mode)');
      return { success: false, message: 'Auto-fill is disabled' };
    }

    const fillSpeed = data.fillSpeed || 500;
    const learnedResponses = data.learnedResponses || {};

    // Find all form fields
    const fields = findFormFields();
    console.log(`[Smart Autofill] Found ${fields.length} total form fields`);

    if (fields.length === 0) {
      console.warn('[Smart Autofill] ❌ No form fields detected on page');
      return {
        success: false,
        message: 'No form fields found on this page. Make sure you are on a job application form.'
      };
    }

    let filledCount = 0;
    let skippedCount = 0;
    let alreadyFilledCount = 0;

    for (const field of fields) {
      // Skip if already filled by us
      if (filledFields.has(field.element)) {
        alreadyFilledCount++;
        continue;
      }

      // Skip if field already has a value (user might have filled it)
      if (field.element.value && field.element.value.trim()) {
        skippedCount++;
        const fieldName = field.element.name || field.element.id || 'unknown';
        console.log(`[Smart Autofill] Skipping pre-filled field: ${fieldName}`);
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, fillSpeed));

      const filled = await fillField(field, data, learnedResponses);
      if (filled) {
        filledCount++;
        filledFields.add(field.element);
      }
    }

    console.log(`[Smart Autofill] ===== FILL SUMMARY =====`);
    console.log(`[Smart Autofill] ✅ Successfully filled: ${filledCount} fields`);
    console.log(`[Smart Autofill] ⏭️  Skipped (already had values): ${skippedCount} fields`);
    console.log(`[Smart Autofill] 🔄 Previously filled by extension: ${alreadyFilledCount} fields`);
    console.log(`[Smart Autofill] 📊 Total fields found: ${fields.length}`);

    // Track this application if we filled any fields
    if (filledCount > 0) {
      await trackApplication();
    }

    if (filledCount === 0) {
      const message = skippedCount > 0
        ? `Found ${fields.length} fields but they are already filled. Clear the form to auto-fill again.`
        : `Found ${fields.length} fields but could not match them with your profile data. Try filling them manually so the extension can learn.`;

      console.warn('[Smart Autofill] ⚠️', message);
      return {
        success: false,
        message: message
      };
    }

    return { success: true, fieldsFilled: filledCount, fieldsTotal: fields.length };
  } catch (error) {
    console.error('[Smart Autofill] Error filling form:', error);
    return { success: false, message: error.message };
  }
}

// Track application to history
async function trackApplication() {
  try {
    const url = window.location.href;
    const hostname = window.location.hostname;
    const title = document.title;

    // Try to extract job title and company from page
    let jobTitle = '';
    let company = '';

    // Common patterns for job titles
    const jobTitlePatterns = [
      document.querySelector('h1'),
      document.querySelector('[class*="job-title"]'),
      document.querySelector('[class*="position"]'),
      document.querySelector('[data-automation="job-title"]')
    ];

    for (const element of jobTitlePatterns) {
      if (element && element.textContent.trim()) {
        jobTitle = element.textContent.trim();
        break;
      }
    }

    // Common patterns for company names
    const companyPatterns = [
      document.querySelector('[class*="company"]'),
      document.querySelector('[class*="employer"]'),
      document.querySelector('[data-automation="company-name"]')
    ];

    for (const element of companyPatterns) {
      if (element && element.textContent.trim()) {
        company = element.textContent.trim();
        break;
      }
    }

    // Fallback to hostname if no company found
    if (!company) {
      company = hostname.replace('www.', '').split('.')[0];
      company = company.charAt(0).toUpperCase() + company.slice(1);
    }

    // Fallback to page title if no job title found
    if (!jobTitle) {
      jobTitle = title.split('|')[0].split('-')[0].trim();
    }

    const application = {
      id: Date.now().toString(),
      jobTitle,
      company,
      url,
      hostname,
      date: new Date().toISOString(),
      timestamp: Date.now()
    };

    // Save to storage
    const data = await chrome.storage.local.get(['applicationHistory']);
    const history = data.applicationHistory || [];

    // Check if this URL was already tracked in the last hour (avoid duplicates)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const alreadyTracked = history.some(app =>
      app.url === url && app.timestamp > oneHourAgo
    );

    if (!alreadyTracked) {
      history.unshift(application); // Add to beginning
      await chrome.storage.local.set({ applicationHistory: history });
      console.log('[Smart Autofill] Application tracked:', jobTitle, 'at', company);
    }
  } catch (error) {
    console.error('Error tracking application:', error);
  }
}

// Find all form fields on the page
function findFormFields() {
  const fields = [];

  // Text inputs, email, tel, url - expanded to catch more input types
  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="search"], input[type="number"], input:not([type])');
  let visibleInputs = 0;
  inputs.forEach(input => {
    if (isVisible(input) && !input.disabled && !input.readOnly) {
      fields.push({ element: input, type: 'input' });
      visibleInputs++;
    }
  });
  console.log(`[Smart Autofill] Found ${visibleInputs} visible text/email/tel/url inputs (${inputs.length} total)`);

  // Textareas
  const textareas = document.querySelectorAll('textarea');
  let visibleTextareas = 0;
  textareas.forEach(textarea => {
    if (isVisible(textarea) && !textarea.disabled && !textarea.readOnly) {
      fields.push({ element: textarea, type: 'textarea' });
      visibleTextareas++;
    }
  });
  console.log(`[Smart Autofill] Found ${visibleTextareas} visible textareas (${textareas.length} total)`);

  // Select dropdowns
  const selects = document.querySelectorAll('select');
  let visibleSelects = 0;
  selects.forEach(select => {
    if (isVisible(select) && !select.disabled) {
      fields.push({ element: select, type: 'select' });
      visibleSelects++;
    }
  });
  console.log(`[Smart Autofill] Found ${visibleSelects} visible select dropdowns (${selects.length} total)`);

  // Radio buttons
  const radios = document.querySelectorAll('input[type="radio"]');
  let visibleRadios = 0;
  radios.forEach(radio => {
    if (isVisible(radio) && !radio.disabled) {
      fields.push({ element: radio, type: 'radio' });
      visibleRadios++;
    }
  });
  console.log(`[Smart Autofill] Found ${visibleRadios} visible radio buttons (${radios.length} total)`);

  // Checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  let visibleCheckboxes = 0;
  checkboxes.forEach(checkbox => {
    if (isVisible(checkbox) && !checkbox.disabled) {
      fields.push({ element: checkbox, type: 'checkbox' });
      visibleCheckboxes++;
    }
  });
  console.log(`[Smart Autofill] Found ${visibleCheckboxes} visible checkboxes (${checkboxes.length} total)`);

  return fields;
}

// Check if element is visible
function isVisible(element) {
  return element.offsetWidth > 0 && 
         element.offsetHeight > 0 && 
         window.getComputedStyle(element).visibility !== 'hidden' &&
         window.getComputedStyle(element).display !== 'none';
}

// Validation helper: Get work experience from resume data
function getResumeWorkExperience(resumeData, index = 0) {
  if (!resumeData || !resumeData.experience || !resumeData.experience[index]) {
    return null;
  }
  return resumeData.experience[index];
}

// Validation helper: Compare two strings with fuzzy matching
function fuzzyCompare(str1, str2) {
  if (!str1 || !str2) return false;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return true;

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // Remove common separators and compare
  const clean1 = s1.replace(/[,.\-_\s]+/g, '');
  const clean2 = s2.replace(/[,.\-_\s]+/g, '');
  if (clean1 === clean2) return true;

  return false;
}

// Validation helper: Compare dates
function compareDates(filledDate, resumeDate) {
  if (!filledDate || !resumeDate) return true; // Can't validate without both

  const filled = filledDate.toString().toLowerCase().trim();
  const resume = resumeDate.toString().toLowerCase().trim();

  // Exact match
  if (filled === resume) return true;

  // Try to extract year and month for comparison
  const filledYear = filled.match(/\d{4}/);
  const resumeYear = resume.match(/\d{4}/);

  if (filledYear && resumeYear && filledYear[0] === resumeYear[0]) {
    // Years match - check month if present
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const filledMonth = months.findIndex(m => filled.includes(m));
    const resumeMonth = months.findIndex(m => resume.includes(m));

    if (filledMonth === -1 || resumeMonth === -1) {
      // Can't determine month, year match is good enough
      return true;
    }

    return filledMonth === resumeMonth;
  }

  return false;
}

// Validation helper: Validate field value against resume
function validateFieldAgainstResume(fieldInfo, value, resumeData) {
  const latestJob = getResumeWorkExperience(resumeData, 0);
  if (!latestJob) {
    // No resume data to validate against
    return { isValid: true, message: '' };
  }

  const search = fieldInfo.searchString;

  // Detect if this is a work experience field
  const isWorkExperienceField = matchesAny(search, [
    'current job', 'current position', 'current employer', 'current company',
    'most recent', 'latest job', 'last job', 'previous job', 'previous employer',
    'work experience 1', 'experience 1', 'employer 1', 'job 1', 'position 1',
    'current title', 'recent position'
  ]);

  if (!isWorkExperienceField) {
    // Check specific field types

    // Job Title validation
    if (matchesAny(search, ['job title', 'position title', 'title', 'role']) &&
        !matchesAny(search, ['desired', 'seeking', 'looking for'])) {
      if (latestJob.title && !fuzzyCompare(value, latestJob.title)) {
        return {
          isValid: false,
          message: `Job title mismatch: filled "${value}" but resume shows "${latestJob.title}"`
        };
      }
    }

    // Company validation
    if (matchesAny(search, ['company', 'employer', 'organization']) &&
        !matchesAny(search, ['desired', 'dream', 'target'])) {
      if (latestJob.company && !fuzzyCompare(value, latestJob.company)) {
        return {
          isValid: false,
          message: `Company mismatch: filled "${value}" but resume shows "${latestJob.company}"`
        };
      }
    }

    // Location validation
    if (matchesAny(search, ['work location', 'job location', 'office location']) ||
        (matchesAny(search, ['location', 'city', 'state']) &&
         matchesAny(search, ['work', 'job', 'employer', 'office']))) {
      if (latestJob.location && !fuzzyCompare(value, latestJob.location)) {
        return {
          isValid: false,
          message: `Location mismatch: filled "${value}" but resume shows "${latestJob.location}"`
        };
      }
    }

    // Start date validation
    if (matchesAny(search, ['start date', 'started', 'from date', 'begin date']) &&
        matchesAny(search, ['work', 'job', 'employment', 'position'])) {
      if (latestJob.startDate && !compareDates(value, latestJob.startDate)) {
        return {
          isValid: false,
          message: `Start date mismatch: filled "${value}" but resume shows "${latestJob.startDate}"`
        };
      }
    }

    // End date validation
    if (matchesAny(search, ['end date', 'ended', 'to date', 'until']) &&
        matchesAny(search, ['work', 'job', 'employment', 'position'])) {
      if (latestJob.endDate && !compareDates(value, latestJob.endDate)) {
        return {
          isValid: false,
          message: `End date mismatch: filled "${value}" but resume shows "${latestJob.endDate}"`
        };
      }
    }
  }

  return { isValid: true, message: '' };
}

// Validation helper: Add visual warning to field
function addValidationWarning(element, message) {
  console.warn(`[Resume Validation] ${message}`);

  // Add warning highlight (orange/yellow instead of green)
  const originalBackground = element.style.background;
  element.style.background = '#fef3c7'; // Light yellow
  element.style.border = '2px solid #f59e0b'; // Orange border
  element.style.transition = 'background 0.5s ease, border 0.5s ease';

  // Create tooltip/warning message
  const warningDiv = document.createElement('div');
  warningDiv.className = 'resume-validation-warning';
  warningDiv.textContent = '⚠️ ' + message;
  warningDiv.style.cssText = `
    position: absolute;
    background: #fef3c7;
    border: 2px solid #f59e0b;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    color: #92400e;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    margin-top: 4px;
  `;

  // Position warning below the field
  const rect = element.getBoundingClientRect();
  warningDiv.style.top = (rect.bottom + window.scrollY) + 'px';
  warningDiv.style.left = (rect.left + window.scrollX) + 'px';

  // Add to page
  document.body.appendChild(warningDiv);

  // Remove warning after 10 seconds
  setTimeout(() => {
    warningDiv.remove();
    element.style.background = originalBackground;
    element.style.border = '';
  }, 10000);
}

// Fill a single field
async function fillField(field, userData, learnedResponses) {
  const element = field.element;
  const fieldInfo = getFieldInfo(element);

  // Log field info for debugging
  const fieldName = fieldInfo.label || fieldInfo.name || fieldInfo.placeholder || fieldInfo.id || 'unknown';
  const fieldId = fieldInfo.id || '(no id)';
  const fieldNameAttr = fieldInfo.name || '(no name)';

  console.log(`[Smart Autofill] ===== Analyzing field =====`);
  console.log(`[Smart Autofill] Field label: "${fieldName}"`);
  console.log(`[Smart Autofill] Field ID: ${fieldId}`);
  console.log(`[Smart Autofill] Field name: ${fieldNameAttr}`);
  console.log(`[Smart Autofill] Field type: ${field.type}`);
  console.log(`[Smart Autofill] Placeholder: "${fieldInfo.placeholder || '(none)'}"`);

  // PRIORITY 1: Try smart matching first (uses profile data: name, email, phone, etc.)
  const value = smartMatch(fieldInfo, userData);
  if (value) {
    console.log(`[Smart Autofill] ✓ MATCH FOUND - Using profile data`);
    console.log(`[Smart Autofill] ✓ Filling "${fieldName}" with: "${value}"`);
    const filled = setFieldValue(field, value);

    if (filled) {
      console.log(`[Smart Autofill] ✅ Successfully filled "${fieldName}"`);
    } else {
      console.warn(`[Smart Autofill] ⚠️ Failed to set value for "${fieldName}"`);
    }

    // Validate filled value against resume
    if (filled && userData.resumeData) {
      const validation = validateFieldAgainstResume(fieldInfo, value, userData.resumeData);
      if (!validation.isValid) {
        addValidationWarning(element, validation.message);
      }
    }

    return filled;
  }

  // PRIORITY 2: Check if we've learned a response for this field (custom/unique fields)
  const learnedValue = findLearnedResponse(fieldInfo, learnedResponses);
  if (learnedValue) {
    console.log(`[Smart Autofill] ✓ LEARNED MATCH - Using learned data`);
    console.log(`[Smart Autofill] ✓ Filling "${fieldName}" with learned value: "${learnedValue}"`);
    const filled = setFieldValue(field, learnedValue);

    if (filled) {
      console.log(`[Smart Autofill] ✅ Successfully filled "${fieldName}" with learned data`);
    } else {
      console.warn(`[Smart Autofill] ⚠️ Failed to set learned value for "${fieldName}"`);
    }

    // Validate filled value against resume
    if (filled && userData.resumeData) {
      const validation = validateFieldAgainstResume(fieldInfo, learnedValue, userData.resumeData);
      if (!validation.isValid) {
        addValidationWarning(element, validation.message);
      }
    }

    return filled;
  }

  console.log(`[Smart Autofill] ✗ NO MATCH - Could not find data for "${fieldName}"`);
  console.log(`[Smart Autofill] Field search string: "${fieldInfo.searchString.substring(0, 100)}..."`);
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

// Set field value with framework compatibility (React, Angular, Vue)
function setFieldValue(field, value) {
  const element = field.element;

  try {
    if (field.type === 'input' || field.type === 'textarea') {
      // For text inputs and textareas
      // Use native setter to bypass React's synthetic events
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, value);
      } else {
        element.value = value;
      }

      // Trigger multiple events for framework compatibility
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));

      // For React specifically
      element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));

      highlightField(element);
      console.log(`[Smart Autofill] Set value for ${element.name || element.id}: "${value}"`);
      return true;
    } else if (field.type === 'select') {
      // For select dropdowns
      const option = findBestOption(element, value);
      if (option) {
        element.value = option.value;
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
        highlightField(element);
        console.log(`[Smart Autofill] Selected option for ${element.name || element.id}: "${option.textContent}"`);
        return true;
      } else {
        console.warn(`[Smart Autofill] Could not find matching option for: "${value}"`);
      }
    } else if (field.type === 'radio') {
      // For radio buttons
      if (shouldSelectRadio(element, value)) {
        element.checked = true;
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
        highlightField(element);
        console.log(`[Smart Autofill] Selected radio button: ${element.name || element.id}`);
        return true;
      }
    } else if (field.type === 'checkbox') {
      // For checkboxes (e.g., terms and conditions)
      if (shouldCheckBox(element)) {
        element.checked = true;
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
        highlightField(element);
        console.log(`[Smart Autofill] Checked checkbox: ${element.name || element.id}`);
        return true;
      }
    }
  } catch (error) {
    console.error('[Smart Autofill] Error setting field value:', error);
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
chrome.storage.local.get(['autoFillEnabled', 'autoFillMode'], async (data) => {
  // Check if we should auto-fill
  const autoFillMode = data.autoFillMode || 'manual'; // Default to manual
  const isJobSite = await isJobApplicationSite();

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

// Global observer variable to prevent memory leaks
let formObserver = null;
let formCheckTimeout = null;

// Dynamic form detection - watch for forms added after page load
chrome.storage.local.get(['autoFillEnabled', 'autoFillMode'], async (data) => {
  const autoFillMode = data.autoFillMode || 'manual';
  const isJobSite = await isJobApplicationSite();

  // Only enable dynamic detection if in automatic mode and on job site
  if (data.autoFillEnabled && autoFillMode === 'automatic' && isJobSite) {
    initDynamicFormDetection();
  }
});

function initDynamicFormDetection() {
  // Disconnect existing observer to prevent duplicates
  if (formObserver) {
    formObserver.disconnect();
    formObserver = null;
  }

  // Clear any pending timeouts
  if (formCheckTimeout) {
    clearTimeout(formCheckTimeout);
    formCheckTimeout = null;
  }

  let lastFieldCount = 0;
  let fillAttempts = 0;
  const maxFillAttempts = 3; // Limit fills per page to avoid loops

  formObserver = new MutationObserver((mutations) => {
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

  formObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('Dynamic form detection enabled');
}

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
  if (formObserver) {
    formObserver.disconnect();
    formObserver = null;
  }
  if (formCheckTimeout) {
    clearTimeout(formCheckTimeout);
    formCheckTimeout = null;
  }
});

// Cleanup on page visibility change (tab backgrounded)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && formObserver) {
    // Disconnect observer when tab is hidden to save resources
    formObserver.disconnect();
    console.log('[Smart Autofill] Observer paused (tab hidden)');
  } else if (!document.hidden && formObserver === null) {
    // Reinitialize when tab becomes visible again (if applicable)
    chrome.storage.local.get(['autoFillEnabled', 'autoFillMode'], async (data) => {
      const autoFillMode = data.autoFillMode || 'manual';
      const isJobSite = await isJobApplicationSite();
      if (data.autoFillEnabled && autoFillMode === 'automatic' && isJobSite) {
        initDynamicFormDetection();
        console.log('[Smart Autofill] Observer resumed (tab visible)');
      }
    });
  }
});

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
