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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadSettings();
  loadLearnedData();
  loadStats();
  checkCurrentSite();
  loadHistory();
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

// Resume upload
uploadArea.addEventListener('click', () => {
  resumeUpload.click();
});

resumeUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  showStatus('Uploading and parsing resume...', 'info');

  try {
    const text = await readFileAsText(file);
    const parsedData = parseResume(text);
    
    // Save resume data
    await chrome.storage.local.set({
      resumeText: text,
      resumeData: parsedData,
      resumeFileName: file.name
    });

    // Auto-fill profile fields
    if (parsedData.name) document.getElementById('full-name').value = parsedData.name;
    if (parsedData.email) document.getElementById('email').value = parsedData.email;
    if (parsedData.phone) document.getElementById('phone').value = parsedData.phone;
    if (parsedData.linkedin) document.getElementById('linkedin').value = parsedData.linkedin;
    if (parsedData.location) document.getElementById('location').value = parsedData.location;

    showStatus(`✅ Resume uploaded: ${file.name}`, 'success');
  } catch (error) {
    showStatus('❌ Error uploading resume', 'error');
    console.error(error);
  }
});

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

  return data;
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  fillCurrentPageBtn.disabled = true;
  fillCurrentPageBtn.textContent = '⏳ Filling...';

  chrome.tabs.sendMessage(tab.id, { action: 'fillForm' }, (response) => {
    fillCurrentPageBtn.disabled = false;
    fillCurrentPageBtn.textContent = '⚡ Fill Current Page';
    
    if (response && response.success) {
      // Update stats
      incrementFormsFilled();
    }
  });
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
    item.innerHTML = `
      <div class="learned-question">${truncate(question, 60)}</div>
      <div class="learned-answer">Answer: ${truncate(answer, 80)}</div>
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

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
        <div style="font-weight: 600; color: #111827; flex: 1;">${truncate(app.jobTitle, 40)}</div>
        <button class="delete-app-btn" data-id="${app.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0 5px; font-size: 16px;">×</button>
      </div>
      <div style="font-size: 13px; color: #6b7280; margin-bottom: 3px;">🏢 ${truncate(app.company, 35)}</div>
      <div style="font-size: 12px; color: #9ca3af;">📅 ${dateStr} at ${timeStr}</div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🔗 ${app.hostname}</div>
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

  // Create CSV content
  const headers = ['Date', 'Time', 'Job Title', 'Company', 'URL'];
  const rows = history.map(app => {
    const date = new Date(app.date);
    return [
      date.toLocaleDateString('en-US'),
      date.toLocaleTimeString('en-US'),
      `"${app.jobTitle.replace(/"/g, '""')}"`,
      `"${app.company.replace(/"/g, '""')}"`,
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
