// DOM Elements
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const resumeUpload = document.getElementById('resume-upload');
const uploadArea = document.getElementById('upload-area');
const resumeStatus = document.getElementById('resume-status');
const saveProfileBtn = document.getElementById('save-profile');
const saveSettingsBtn = document.getElementById('save-settings');
const fillCurrentPageBtn = document.getElementById('fill-current-page');
const clearLearnedBtn = document.getElementById('clear-learned');
const fillSpeedInput = document.getElementById('fill-speed');
const speedValue = document.getElementById('speed-value');
const learnedDataList = document.getElementById('learned-data-list');
const exportCsvBtn = document.getElementById('export-csv');
const clearHistoryBtn = document.getElementById('clear-history');
const historyList = document.getElementById('history-list');
const customSiteInput = document.getElementById('custom-site-input');
const addCustomSiteBtn = document.getElementById('add-custom-site');
const allowedSitesList = document.getElementById('allowed-sites-list');
const resetDefaultSitesBtn = document.getElementById('reset-default-sites');
const toggleAllSitesBtn = document.getElementById('toggle-all-sites');

// ===== SECURITY UTILITIES =====

// HTML escape function to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// CSV cell sanitization to prevent formula injection
function sanitizeCsvCell(value) {
  if (!value) return '""';
  const strValue = String(value);

  // Prepend single quote if starts with dangerous characters
  if (/^[=+\-@\t\r]/.test(strValue)) {
    return `"'${strValue.replace(/"/g, '""')}"`;
  }
  return `"${strValue.replace(/"/g, '""')}"`;
}

// Check storage quota and warn if getting full
async function checkStorageQuota() {
  try {
    const usage = await chrome.storage.local.getBytesInUse(null);
    const limit = 10485760; // 10MB limit for chrome.storage.local
    const percentage = (usage / limit) * 100;

    return {
      usage,
      limit,
      percentage,
      remaining: limit - usage
    };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return { usage: 0, limit: 10485760, percentage: 0, remaining: 10485760 };
  }
}

// ===== END SECURITY UTILITIES =====

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadSettings();
  loadLearnedData();
  loadStats();
  checkCurrentSite();
  loadHistory();
  loadAllowedSites();
  displaySavedResumes(); // Load saved resumes
});

// Check if current site is on the job site allowlist
async function checkCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: 'checkSite' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script might not be loaded yet
        console.log('Could not check site:', chrome.runtime.lastError.message);
        return;
      }

      const siteStatus = document.getElementById('site-status');
      const siteStatusText = document.getElementById('site-status-text');

      if (response && response.isJobSite) {
        siteStatus.style.display = 'block';
        siteStatus.style.background = '#d1fae5';
        siteStatus.style.color = '#065f46';
        siteStatusText.textContent = '✅ Job application site detected - Auto-fill available';
      } else {
        siteStatus.style.display = 'block';
        siteStatus.style.background = '#fee2e2';
        siteStatus.style.color = '#991b1b';
        siteStatusText.textContent = '⚠️ Not a recognized job site - Manual fill only';
      }
    });
  } catch (error) {
    console.error('Error checking site:', error);
  }
}

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(`${targetTab}-tab`).classList.add('active');
  });
});

// Resume upload - Note: No click handler needed, label handles it natively
resumeUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file size (limit to 500KB)
  if (file.size > 500000) {
    showStatus('❌ Resume too large. Please use a smaller file (<500KB)', 'error');
    e.target.value = ''; // Reset file input
    return;
  }

  showStatus('⏳ Uploading and parsing resume...', 'info');

  try {
    // Check storage quota before uploading
    const quota = await checkStorageQuota();
    if (quota.percentage > 80) {
      const continueUpload = confirm(
        `Storage is ${quota.percentage.toFixed(0)}% full. ` +
        `You have ${(quota.remaining / 1024).toFixed(0)}KB remaining. Continue?`
      );
      if (!continueUpload) {
        e.target.value = ''; // Reset file input
        showStatus('Upload cancelled', 'info');
        return;
      }
    }

    const text = await readFileAsText(file);
    const parsedData = parseResume(text);

    // Get existing resumes
    const data = await chrome.storage.local.get(['savedResumes', 'defaultResumeId']);
    const savedResumes = data.savedResumes || [];

    // Create new resume object
    const resumeId = Date.now().toString();
    const newResume = {
      id: resumeId,
      fileName: file.name,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      text: text,
      parsedData: parsedData
    };

    // Add to saved resumes
    savedResumes.push(newResume);

    // Set as default if it's the first resume
    const defaultResumeId = data.defaultResumeId || resumeId;

    // Save to storage with error handling
    try {
      await chrome.storage.local.set({
        savedResumes: savedResumes,
        defaultResumeId: defaultResumeId,
        // Keep backward compatibility
        resumeText: newResume.text,
        resumeData: newResume.parsedData,
        resumeFileName: newResume.fileName
      });
    } catch (storageError) {
      if (storageError.message && storageError.message.includes('QUOTA')) {
        showStatus('❌ Storage full. Please clear some data and try again.', 'error');
        e.target.value = ''; // Reset file input
        return;
      }
      throw storageError;
    }

    // Auto-fill profile fields if this is the default resume
    if (defaultResumeId === resumeId) {
      if (parsedData.name) document.getElementById('full-name').value = parsedData.name;
      if (parsedData.email) document.getElementById('email').value = parsedData.email;
      if (parsedData.phone) document.getElementById('phone').value = parsedData.phone;
      if (parsedData.linkedin) document.getElementById('linkedin').value = parsedData.linkedin;
      if (parsedData.location) document.getElementById('location').value = parsedData.location;
    }

    // Clear file input
    e.target.value = '';

    // Show success with larger, more visible confirmation
    showStatus(`✅ Resume saved successfully: ${escapeHtml(file.name)}`, 'success');

    // Reload saved resumes display
    displaySavedResumes();

    // Show celebration notification
    setTimeout(() => {
      showStatus(`🎉 ${escapeHtml(file.name)} is ready to use!`, 'success');
    }, 1500);

  } catch (error) {
    showStatus('❌ Error uploading resume', 'error');
    console.error('Resume upload error:', error);
    e.target.value = ''; // Reset file input
  }
});

// Display saved resumes
async function displaySavedResumes() {
  const data = await chrome.storage.local.get(['savedResumes', 'defaultResumeId']);
  const savedResumes = data.savedResumes || [];
  const defaultResumeId = data.defaultResumeId;

  const section = document.getElementById('saved-resumes-section');
  const list = document.getElementById('saved-resumes-list');

  if (savedResumes.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = '';

  savedResumes.forEach((resume, index) => {
    const isDefault = resume.id === defaultResumeId;
    const uploadDate = new Date(resume.uploadDate);
    const dateStr = uploadDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      padding: 10px;
      margin-bottom: 8px;
      background: ${isDefault ? '#d1fae5' : '#ffffff'};
      border: 2px solid ${isDefault ? '#10b981' : '#e5e7eb'};
      border-radius: 6px;
      transition: all 0.2s;
      cursor: pointer;
    `;

    item.innerHTML = `
      <input
        type="radio"
        name="resume-selector"
        value="${escapeHtml(resume.id)}"
        ${isDefault ? 'checked' : ''}
        style="margin-right: 10px; cursor: pointer; flex-shrink: 0;"
        data-resume-id="${escapeHtml(resume.id)}"
      >
      <div style="flex: 1; min-width: 0; margin-right: 10px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
          <span style="font-weight: 600; color: #111827; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 1;">
            ${escapeHtml(resume.fileName)}
          </span>
          ${isDefault ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; white-space: nowrap; flex-shrink: 0;">DEFAULT</span>' : ''}
        </div>
        <div style="font-size: 11px; color: #6b7280;">
          ${formatFileSize(resume.fileSize)} • Uploaded ${escapeHtml(dateStr)}
        </div>
      </div>
      <button
        class="delete-resume-btn"
        data-resume-id="${escapeHtml(resume.id)}"
        style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px; flex-shrink: 0;"
      >
        🗑️ Delete
      </button>
    `;

    // Radio button click handler
    const radio = item.querySelector('input[type="radio"]');
    radio.addEventListener('change', async () => {
      if (radio.checked) {
        await selectResume(resume.id);
      }
    });

    // Item click handler (select on click anywhere except delete button)
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('delete-resume-btn')) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    });

    // Hover effect
    item.addEventListener('mouseenter', () => {
      if (!isDefault) {
        item.style.background = '#f3f4f6';
      }
    });
    item.addEventListener('mouseleave', () => {
      if (!isDefault) {
        item.style.background = '#ffffff';
      }
    });

    list.appendChild(item);
  });

  // Add delete button handlers
  document.querySelectorAll('.delete-resume-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const resumeId = btn.dataset.resumeId;
      await deleteResume(resumeId);
    });
  });
}

// Select a resume as default
async function selectResume(resumeId) {
  try {
    const data = await chrome.storage.local.get(['savedResumes']);
    const savedResumes = data.savedResumes || [];

    const selectedResume = savedResumes.find(r => r.id === resumeId);
    if (!selectedResume) {
      showStatus('❌ Resume not found', 'error');
      return;
    }

    // Update default resume ID and backward compatibility fields
    await chrome.storage.local.set({
      defaultResumeId: resumeId,
      resumeText: selectedResume.text,
      resumeData: selectedResume.parsedData,
      resumeFileName: selectedResume.fileName
    });

    // Auto-fill profile fields with selected resume
    const parsedData = selectedResume.parsedData;
    if (parsedData.name) document.getElementById('full-name').value = parsedData.name;
    if (parsedData.email) document.getElementById('email').value = parsedData.email;
    if (parsedData.phone) document.getElementById('phone').value = parsedData.phone;
    if (parsedData.linkedin) document.getElementById('linkedin').value = parsedData.linkedin;
    if (parsedData.location) document.getElementById('location').value = parsedData.location;

    // Refresh display
    displaySavedResumes();

    // Show confirmation
    showStatus(`✅ Now using: ${escapeHtml(selectedResume.fileName)}`, 'success');
  } catch (error) {
    console.error('Error selecting resume:', error);
    showStatus('❌ Error selecting resume', 'error');
  }
}

// Delete a resume
async function deleteResume(resumeId) {
  const data = await chrome.storage.local.get(['savedResumes', 'defaultResumeId']);
  const savedResumes = data.savedResumes || [];
  const defaultResumeId = data.defaultResumeId;

  const resumeToDelete = savedResumes.find(r => r.id === resumeId);
  if (!resumeToDelete) return;

  const confirmDelete = confirm(
    `Delete "${resumeToDelete.fileName}"?\n\nThis cannot be undone.`
  );

  if (!confirmDelete) return;

  // Remove from array
  const updatedResumes = savedResumes.filter(r => r.id !== resumeId);

  // If deleting the default resume, set a new default
  let newDefaultId = defaultResumeId;
  if (resumeId === defaultResumeId) {
    newDefaultId = updatedResumes.length > 0 ? updatedResumes[0].id : null;
  }

  // Update storage
  await chrome.storage.local.set({
    savedResumes: updatedResumes,
    defaultResumeId: newDefaultId
  });

  // Update backward compatibility fields
  if (newDefaultId) {
    const newDefault = updatedResumes.find(r => r.id === newDefaultId);
    await chrome.storage.local.set({
      resumeText: newDefault.text,
      resumeData: newDefault.parsedData,
      resumeFileName: newDefault.fileName
    });

    // Update profile fields
    const parsedData = newDefault.parsedData;
    if (parsedData.name) document.getElementById('full-name').value = parsedData.name;
    if (parsedData.email) document.getElementById('email').value = parsedData.email;
    if (parsedData.phone) document.getElementById('phone').value = parsedData.phone;
    if (parsedData.linkedin) document.getElementById('linkedin').value = parsedData.linkedin;
    if (parsedData.location) document.getElementById('location').value = parsedData.location;
  } else {
    // No resumes left, clear fields
    await chrome.storage.local.set({
      resumeText: '',
      resumeData: null,
      resumeFileName: ''
    });
  }

  // Refresh display
  displaySavedResumes();

  showStatus(`🗑️ Deleted: ${escapeHtml(resumeToDelete.fileName)}`, 'info');
}

// Format file size helper
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Read file as text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Parse resume text
function parseResume(text) {
  const data = {
    fullText: text,
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    location: '',
    skills: [],
    experience: [],
    education: []
  };

  // Extract email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) data.email = emailMatch[0];

  // Extract phone
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) data.phone = phoneMatch[0];

  // Extract LinkedIn
  const linkedinRegex = /linkedin\.com\/in\/[\w-]+/i;
  const linkedinMatch = text.match(linkedinRegex);
  if (linkedinMatch) data.linkedin = 'https://' + linkedinMatch[0];

  // Extract name (assume first line or first few words)
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length < 50 && !firstLine.includes('@')) {
      data.name = firstLine;
    }
  }

  // Extract location (city, state patterns)
  const locationRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})/;
  const locationMatch = text.match(locationRegex);
  if (locationMatch) {
    data.location = `${locationMatch[1]}, ${locationMatch[2]}`;
  }

  // Extract work experience
  data.experience = extractWorkExperience(text, lines);

  return data;
}

// Extract work experience from resume
function extractWorkExperience(text, lines) {
  const experience = [];
  const textLower = text.toLowerCase();

  // Find experience section
  const expSectionPatterns = [
    'experience',
    'work history',
    'employment history',
    'professional experience',
    'work experience'
  ];

  let expStartIndex = -1;
  let expEndIndex = lines.length;

  for (const pattern of expSectionPatterns) {
    const index = lines.findIndex(line =>
      line.toLowerCase().trim() === pattern ||
      line.toLowerCase().includes(pattern) && line.length < 30
    );
    if (index !== -1) {
      expStartIndex = index;
      break;
    }
  }

  // Find where experience section ends (usually education or skills)
  if (expStartIndex !== -1) {
    const endPatterns = ['education', 'skills', 'certifications', 'projects'];
    for (let i = expStartIndex + 1; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase().trim();
      if (endPatterns.some(p => lineLower === p || (lineLower.includes(p) && lines[i].length < 30))) {
        expEndIndex = i;
        break;
      }
    }

    // Extract jobs from experience section
    const expLines = lines.slice(expStartIndex + 1, expEndIndex);
    let currentJob = null;

    for (let i = 0; i < expLines.length; i++) {
      const line = expLines[i].trim();
      if (!line) continue;

      // Date pattern (e.g., "Jan 2020 - Present", "2019-2021", "Jan 2020 - Dec 2022")
      const datePattern = /(\w+\s+\d{4}|\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\d{4}|Present|Current)/i;
      const dateMatch = line.match(datePattern);

      // Job title patterns (usually first line or line with dates)
      const titleIndicators = ['engineer', 'developer', 'manager', 'analyst', 'specialist', 'consultant', 'director', 'coordinator', 'administrator', 'designer', 'architect'];
      const seemsLikeTitle = titleIndicators.some(indicator =>
        line.toLowerCase().includes(indicator)
      ) || (line.length < 60 && line.length > 5 && !dateMatch);

      if (seemsLikeTitle && !dateMatch && !currentJob) {
        // Start new job entry
        currentJob = {
          title: line,
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          description: []
        };
      } else if (currentJob && !currentJob.company && line.length < 80) {
        // Next line is likely company
        const companyMatch = line.match(/^([^|•\-]+?)(?:\s*[|•\-]\s*(.+))?$/);
        if (companyMatch) {
          currentJob.company = companyMatch[1].trim();

          // Check for location in same line
          if (companyMatch[2]) {
            const locationMatch = companyMatch[2].match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})/);
            if (locationMatch) {
              currentJob.location = `${locationMatch[1]}, ${locationMatch[2]}`;
            }
          }
        }
      } else if (dateMatch && currentJob) {
        // Extract dates
        currentJob.startDate = dateMatch[1].trim();
        currentJob.endDate = dateMatch[2].trim();

        // Check for location in same line
        if (!currentJob.location) {
          const locationMatch = line.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})/);
          if (locationMatch) {
            currentJob.location = `${locationMatch[1]}, ${locationMatch[2]}`;
          }
        }

        // Save current job and start new one
        if (currentJob.title && currentJob.company) {
          experience.push(currentJob);
        }
        currentJob = null;
      }
    }

    // Add last job if exists
    if (currentJob && currentJob.title && currentJob.company) {
      experience.push(currentJob);
    }
  }

  console.log('[Resume Parser] Extracted experience:', experience);
  return experience;
}

// Show status message
function showStatus(message, type) {
  resumeStatus.textContent = message;
  resumeStatus.className = `status-message ${type}`;
  setTimeout(() => {
    resumeStatus.textContent = '';
    resumeStatus.className = 'status-message';
  }, 3000);
}

// Load profile data
async function loadProfile() {
  const data = await chrome.storage.local.get([
    'fullName', 'email', 'phone', 'linkedin', 'location', 'resumeFileName'
  ]);

  if (data.fullName) document.getElementById('full-name').value = data.fullName;
  if (data.email) document.getElementById('email').value = data.email;
  if (data.phone) document.getElementById('phone').value = data.phone;
  if (data.linkedin) document.getElementById('linkedin').value = data.linkedin;
  if (data.location) document.getElementById('location').value = data.location;

  if (data.resumeFileName) {
    showStatus(`📄 Resume loaded: ${data.resumeFileName}`, 'success');
  }
}

// Save profile
saveProfileBtn.addEventListener('click', async () => {
  const profile = {
    fullName: document.getElementById('full-name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    linkedin: document.getElementById('linkedin').value,
    location: document.getElementById('location').value
  };

  await chrome.storage.local.set(profile);
  
  // Show success message
  const originalText = saveProfileBtn.textContent;
  saveProfileBtn.textContent = '✅ Saved!';
  setTimeout(() => {
    saveProfileBtn.textContent = originalText;
  }, 2000);
});

// Load settings
async function loadSettings() {
  const data = await chrome.storage.local.get([
    'autoFillEnabled', 'autoFillMode', 'learnMode', 'smartMode', 'autoNavigate', 'fillSpeed', 'workAuth'
  ]);

  document.getElementById('auto-fill-enabled').checked = data.autoFillEnabled !== false;
  document.getElementById('auto-fill-mode').value = data.autoFillMode || 'manual'; // Default to manual
  document.getElementById('learn-mode').checked = data.learnMode !== false;
  document.getElementById('smart-mode').checked = data.smartMode !== false;
  document.getElementById('auto-navigate').checked = data.autoNavigate === true; // Default off
  document.getElementById('fill-speed').value = data.fillSpeed || 500;
  document.getElementById('speed-value').textContent = (data.fillSpeed || 500) + 'ms';
  document.getElementById('work-auth').value = data.workAuth || '';
}

// Save settings
saveSettingsBtn.addEventListener('click', async () => {
  const settings = {
    autoFillEnabled: document.getElementById('auto-fill-enabled').checked,
    autoFillMode: document.getElementById('auto-fill-mode').value,
    learnMode: document.getElementById('learn-mode').checked,
    smartMode: document.getElementById('smart-mode').checked,
    autoNavigate: document.getElementById('auto-navigate').checked,
    fillSpeed: parseInt(document.getElementById('fill-speed').value),
    workAuth: document.getElementById('work-auth').value
  };

  await chrome.storage.local.set(settings);

  const originalText = saveSettingsBtn.textContent;
  saveSettingsBtn.textContent = '✅ Saved!';
  setTimeout(() => {
    saveSettingsBtn.textContent = originalText;
  }, 2000);

  // Show message if automatic mode selected
  if (settings.autoFillMode === 'automatic') {
    alert('Automatic mode enabled! The extension will now auto-fill forms on job application sites when pages load. Refresh any open job application tabs to activate.');
  }
});

// Update speed value display
fillSpeedInput.addEventListener('input', (e) => {
  speedValue.textContent = e.target.value + 'ms';
});

// Fill current page
fillCurrentPageBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showStatus('❌ No active tab found', 'error');
      return;
    }

    // Check if user has saved profile data
    const data = await chrome.storage.local.get(['fullName', 'email', 'phone']);
    const hasProfileData = data.fullName || data.email || data.phone;

    if (!hasProfileData) {
      showStatus('⚠️ Please save your profile data first in the Profile tab', 'error');
      return;
    }

    fillCurrentPageBtn.disabled = true;
    fillCurrentPageBtn.textContent = '⏳ Filling...';
    showStatus('⏳ Analyzing form fields...', 'info');

    chrome.tabs.sendMessage(tab.id, { action: 'fillForm' }, (response) => {
      fillCurrentPageBtn.disabled = false;
      fillCurrentPageBtn.textContent = '⚡ Fill Current Page';

      // Check for Chrome runtime errors
      if (chrome.runtime.lastError) {
        console.error('Fill error:', chrome.runtime.lastError);
        showStatus('❌ Error: Please refresh the page and try again', 'error');
        return;
      }

      // Check if response exists
      if (!response) {
        showStatus('❌ No response from page. Please refresh and try again.', 'error');
        return;
      }

      if (response.success) {
        // Update stats
        incrementFormsFilled();

        // Show success with validation info if applicable
        let message = `✅ Successfully filled ${response.fieldsFilled} out of ${response.fieldsTotal} fields!`;

        const corrections = [];
        if (response.workExperienceCorrected && response.workExperienceCorrected > 0) {
          corrections.push(`${response.workExperienceCorrected} work experience`);
        }
        if (response.educationCorrected && response.educationCorrected > 0) {
          corrections.push(`${response.educationCorrected} education`);
        }

        if (corrections.length > 0) {
          message += ` Auto-corrected ${corrections.join(' and ')} fields.`;
        } else {
          // Show validation info if no corrections were needed
          const validated = [];
          if (response.workExperienceValidated && response.workExperienceValidated > 0) {
            validated.push(`${response.workExperienceValidated} work experience`);
          }
          if (response.educationValidated && response.educationValidated > 0) {
            validated.push(`${response.educationValidated} education`);
          }
          if (validated.length > 0) {
            message += ` Validated ${validated.join(' and ')} section(s).`;
          }
        }

        showStatus(message, 'success');
      } else {
        // Show specific error message
        const message = response.message || 'Could not fill form';
        showStatus(`⚠️ ${message}`, 'error');
        console.log('Fill failed:', response);
      }
    });
  } catch (error) {
    fillCurrentPageBtn.disabled = false;
    fillCurrentPageBtn.textContent = '⚡ Fill Current Page';
    showStatus('❌ Error: ' + error.message, 'error');
    console.error('Fill button error:', error);
  }
});

// Load learned data
async function loadLearnedData() {
  const data = await chrome.storage.local.get(['learnedResponses']);
  const learned = data.learnedResponses || {};

  learnedDataList.innerHTML = '';

  const entries = Object.entries(learned);
  if (entries.length === 0) {
    learnedDataList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🧠</div>
        <p>No learned data yet</p>
        <p style="font-size: 12px; margin-top: 8px;">As you fill forms, I'll remember your choices</p>
      </div>
    `;
    return;
  }

  entries.forEach(([question, answer]) => {
    const item = document.createElement('div');
    item.className = 'learned-item';
    // Use escapeHtml to prevent XSS attacks
    item.innerHTML = `
      <div class="learned-question">${escapeHtml(truncate(question, 60))}</div>
      <div class="learned-answer">Answer: ${escapeHtml(truncate(answer, 80))}</div>
    `;
    learnedDataList.appendChild(item);
  });
}

// Clear learned data
clearLearnedBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all learned data?')) {
    await chrome.storage.local.set({ learnedResponses: {} });
    loadLearnedData();
  }
});

// Load stats
async function loadStats() {
  const data = await chrome.storage.local.get(['formsFilled', 'lastResetDate']);
  const today = new Date().toDateString();
  
  if (data.lastResetDate !== today) {
    await chrome.storage.local.set({ formsFilled: 0, lastResetDate: today });
    document.getElementById('forms-filled').textContent = '0 forms filled today';
  } else {
    document.getElementById('forms-filled').textContent = `${data.formsFilled || 0} forms filled today`;
  }
}

// Increment forms filled
async function incrementFormsFilled() {
  const data = await chrome.storage.local.get(['formsFilled']);
  const count = (data.formsFilled || 0) + 1;
  await chrome.storage.local.set({ formsFilled: count });
  document.getElementById('forms-filled').textContent = `${count} forms filled today`;
}

// Utility function
function truncate(str, maxLen) {
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

// Load application history
async function loadHistory() {
  const data = await chrome.storage.local.get(['applicationHistory']);
  const history = data.applicationHistory || [];

  // Update stats
  updateHistoryStats(history);

  // Display history list
  displayHistoryList(history);
}

// Update history statistics
function updateHistoryStats(history) {
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

  const thisWeekCount = history.filter(app => app.timestamp > oneWeekAgo).length;
  const thisMonthCount = history.filter(app => app.timestamp > oneMonthAgo).length;

  document.getElementById('total-applications').textContent = history.length;
  document.getElementById('this-week-count').textContent = thisWeekCount;
  document.getElementById('this-month-count').textContent = thisMonthCount;
}

// Display history list
function displayHistoryList(history) {
  historyList.innerHTML = '';

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>No applications tracked yet</p>
        <p style="font-size: 12px; margin-top: 8px;">Start applying to jobs and we'll track them here!</p>
      </div>
    `;
    return;
  }

  history.forEach((app, index) => {
    const date = new Date(app.date);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    const item = document.createElement('div');
    item.className = 'history-item';
    item.style.cssText = `
      padding: 12px;
      margin-bottom: 10px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #10b981;
      cursor: pointer;
      transition: all 0.2s;
    `;

    // Use escapeHtml to prevent XSS attacks from malicious job listings
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
        <div style="font-weight: 600; color: #111827; flex: 1;">${escapeHtml(truncate(app.jobTitle, 40))}</div>
        <button class="delete-app-btn" data-id="${escapeHtml(app.id)}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 5px; font-size: 16px;">×</button>
      </div>
      <div style="font-size: 13px; color: #6b7280; margin-bottom: 3px;">🏢 ${escapeHtml(truncate(app.company, 35))}</div>
      <div style="font-size: 12px; color: #9ca3af;">📅 ${escapeHtml(dateStr)} at ${escapeHtml(timeStr)}</div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🔗 ${escapeHtml(app.hostname)}</div>
    `;

    // Click to open URL
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('delete-app-btn')) {
        chrome.tabs.create({ url: app.url });
      }
    });

    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.background = '#e5e7eb';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = '#f9fafb';
    });

    historyList.appendChild(item);
  });

  // Add delete functionality
  document.querySelectorAll('.delete-app-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm('Delete this application from history?')) {
        await deleteApplication(id);
        loadHistory();
      }
    });
  });
}

// Delete a single application
async function deleteApplication(id) {
  const data = await chrome.storage.local.get(['applicationHistory']);
  const history = data.applicationHistory || [];
  const filtered = history.filter(app => app.id !== id);
  await chrome.storage.local.set({ applicationHistory: filtered });
}

// Export history to CSV
exportCsvBtn.addEventListener('click', async () => {
  const data = await chrome.storage.local.get(['applicationHistory']);
  const history = data.applicationHistory || [];

  if (history.length === 0) {
    alert('No applications to export!');
    return;
  }

  // Create CSV content with formula injection protection
  const headers = ['Date', 'Time', 'Job Title', 'Company', 'URL'];
  const rows = history.map(app => {
    const date = new Date(app.date);
    return [
      date.toLocaleDateString('en-US'),
      date.toLocaleTimeString('en-US'),
      sanitizeCsvCell(app.jobTitle),  // Prevent formula injection
      sanitizeCsvCell(app.company),   // Prevent formula injection
      app.url
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-applications-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Show success message
  const originalText = exportCsvBtn.textContent;
  exportCsvBtn.textContent = '✅ Exported!';
  setTimeout(() => {
    exportCsvBtn.textContent = originalText;
  }, 2000);
});

// Clear history
clearHistoryBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all application history? This cannot be undone.')) {
    await chrome.storage.local.set({ applicationHistory: [] });
    loadHistory();
  }
});

// ===== SITE MANAGEMENT =====

let showAllSites = false;
let defaultSitePatterns = [];

// Load and display allowed sites
async function loadAllowedSites() {
  try {
    // Get default sites from content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'getDefaultSites' }, (response) => {
      if (response && response.defaultSites) {
        defaultSitePatterns = response.defaultSites;
        displayAllowedSites();
      }
    });
  } catch (error) {
    console.error('Error loading default sites:', error);
    // Fallback: display with empty defaults
    displayAllowedSites();
  }
}

// Display allowed sites list
async function displayAllowedSites() {
  const data = await chrome.storage.local.get(['allowedSites', 'disabledDefaultSites']);
  const customSites = data.allowedSites || [];
  const disabledSites = data.disabledDefaultSites || [];

  allowedSitesList.innerHTML = '';

  // Display custom sites first
  if (customSites.length > 0) {
    const customHeader = document.createElement('div');
    customHeader.style.cssText = 'font-weight: 600; color: #10b981; margin-bottom: 8px; font-size: 12px;';
    customHeader.textContent = '✨ CUSTOM SITES';
    allowedSitesList.appendChild(customHeader);

    customSites.forEach(site => {
      const item = createSiteItem(site, true, false);
      allowedSitesList.appendChild(item);
    });
  }

  // Display default sites (only if showAllSites is true, otherwise show count)
  if (showAllSites) {
    const defaultHeader = document.createElement('div');
    defaultHeader.style.cssText = 'font-weight: 600; color: #6b7280; margin-top: 15px; margin-bottom: 8px; font-size: 12px;';
    defaultHeader.textContent = '📋 DEFAULT SITES';
    allowedSitesList.appendChild(defaultHeader);

    defaultSitePatterns.forEach(site => {
      const isDisabled = disabledSites.includes(site);
      const item = createSiteItem(site, false, isDisabled);
      allowedSitesList.appendChild(item);
    });
  } else {
    const defaultCount = defaultSitePatterns.length - disabledSites.length;
    const summary = document.createElement('div');
    summary.style.cssText = 'padding: 10px; background: #f3f4f6; border-radius: 6px; margin-top: 10px; text-align: center; color: #6b7280; font-size: 13px;';
    summary.textContent = `✅ ${defaultCount} default sites enabled`;
    allowedSitesList.appendChild(summary);
  }

  if (customSites.length === 0 && !showAllSites) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align: center; padding: 20px; color: #9ca3af; font-size: 13px;';
    empty.textContent = 'No custom sites added yet';
    allowedSitesList.appendChild(empty);
  }
}

// Create site item element
function createSiteItem(site, isCustom, isDisabled) {
  const item = document.createElement('div');
  item.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    margin-bottom: 5px;
    background: ${isDisabled ? '#fee2e2' : '#f9fafb'};
    border-radius: 4px;
    font-size: 12px;
    ${isDisabled ? 'opacity: 0.6; text-decoration: line-through;' : ''}
  `;

  const text = document.createElement('span');
  text.textContent = site;
  text.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
  item.appendChild(text);

  const buttons = document.createElement('div');
  buttons.style.cssText = 'display: flex; gap: 5px;';

  if (isCustom) {
    // Custom sites can be deleted
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.style.cssText = 'background: #ef4444; color: white; border: none; border-radius: 3px; padding: 2px 8px; cursor: pointer; font-size: 16px;';
    deleteBtn.onclick = () => deleteCustomSite(site);
    buttons.appendChild(deleteBtn);
  } else {
    // Default sites can be toggled on/off
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = isDisabled ? '👁️' : '🚫';
    toggleBtn.title = isDisabled ? 'Enable site' : 'Disable site';
    toggleBtn.style.cssText = 'background: #6b7280; color: white; border: none; border-radius: 3px; padding: 2px 8px; cursor: pointer;';
    toggleBtn.onclick = () => toggleDefaultSite(site, isDisabled);
    buttons.appendChild(toggleBtn);
  }

  item.appendChild(buttons);
  return item;
}

// Add custom site
addCustomSiteBtn.addEventListener('click', async () => {
  const site = customSiteInput.value.trim().toLowerCase();

  if (!site) {
    alert('Please enter a domain or URL pattern');
    return;
  }

  // Enhanced validation to prevent XSS and injection attacks
  if (site.includes(' ')) {
    alert('Site pattern cannot contain spaces');
    return;
  }

  // Prevent dangerous characters and patterns
  if (/<|>|script|javascript:|data:|;|\||&|`|'|"/i.test(site)) {
    alert('Invalid characters in site pattern. Please use only letters, numbers, dots, dashes, and slashes.');
    return;
  }

  // Validate domain format
  if (!site.startsWith('/')) {
    // Should look like a domain (basic check)
    if (!/^[a-z0-9.-]+$/i.test(site)) {
      alert('Invalid domain format. Use only letters, numbers, dots, and dashes.\nExample: workday.com or mycompany.jobs');
      return;
    }

    // Prevent obviously invalid patterns
    if (site.startsWith('.') || site.endsWith('.') || site.includes('..')) {
      alert('Invalid domain format. Dots cannot be at the start/end or consecutive.');
      return;
    }
  } else {
    // Path-based pattern
    if (!/^\/[a-z0-9\/-]*$/i.test(site)) {
      alert('Invalid path format. Use only letters, numbers, slashes, and dashes.\nExample: /careers or /jobs');
      return;
    }
  }

  // Limit length to prevent abuse
  if (site.length > 100) {
    alert('Site pattern too long (max 100 characters)');
    return;
  }

  const data = await chrome.storage.local.get(['allowedSites']);
  const customSites = data.allowedSites || [];

  // Check if already exists
  if (customSites.includes(site) || defaultSitePatterns.includes(site)) {
    alert('This site is already in the list');
    return;
  }

  // Limit total custom sites to prevent abuse
  if (customSites.length >= 50) {
    alert('Maximum custom sites reached (50). Please remove some before adding more.');
    return;
  }

  customSites.push(site);
  await chrome.storage.local.set({ allowedSites: customSites });

  customSiteInput.value = '';
  displayAllowedSites();

  // Show success
  const originalText = addCustomSiteBtn.textContent;
  addCustomSiteBtn.textContent = '✅ Added!';
  setTimeout(() => {
    addCustomSiteBtn.textContent = originalText;
  }, 1500);
});

// Delete custom site
async function deleteCustomSite(site) {
  if (!confirm(`Remove "${site}" from allowed sites?`)) return;

  const data = await chrome.storage.local.get(['allowedSites']);
  const customSites = data.allowedSites || [];
  const filtered = customSites.filter(s => s !== site);
  await chrome.storage.local.set({ allowedSites: filtered });
  displayAllowedSites();
}

// Toggle default site
async function toggleDefaultSite(site, isCurrentlyDisabled) {
  const data = await chrome.storage.local.get(['disabledDefaultSites']);
  const disabledSites = data.disabledDefaultSites || [];

  if (isCurrentlyDisabled) {
    // Enable it (remove from disabled list)
    const filtered = disabledSites.filter(s => s !== site);
    await chrome.storage.local.set({ disabledDefaultSites: filtered });
  } else {
    // Disable it (add to disabled list)
    disabledSites.push(site);
    await chrome.storage.local.set({ disabledDefaultSites: disabledSites });
  }

  displayAllowedSites();
}

// Reset to default sites
resetDefaultSitesBtn.addEventListener('click', async () => {
  if (!confirm('Reset to default sites? This will remove all custom sites and re-enable all default sites.')) {
    return;
  }

  await chrome.storage.local.set({
    allowedSites: [],
    disabledDefaultSites: []
  });

  displayAllowedSites();

  alert('✅ Reset to defaults!');
});

// Toggle showing all sites
toggleAllSitesBtn.addEventListener('click', () => {
  showAllSites = !showAllSites;
  toggleAllSitesBtn.textContent = showAllSites ? '👁️ Show Less' : '👁️ Show All';
  displayAllowedSites();
});

// Allow Enter key to add site
customSiteInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addCustomSiteBtn.click();
  }
});
