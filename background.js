// Background service worker

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Smart Job Autofill extension event:', details.reason);
  
  if (details.reason === 'install') {
    console.log('Smart Job Autofill extension installed');
    
    // Set default values
    chrome.storage.local.set({
      autoFillEnabled: true,
      learnMode: true,
      smartMode: true,
      fillSpeed: 500,
      formsFilled: 0,
      lastResetDate: new Date().toDateString(),
      learnedResponses: {}
    });
  }
  
  // Create context menu
  try {
    chrome.contextMenus.create({
      id: 'fillCurrentForm',
      title: 'Fill this form with Smart Autofill',
      contexts: ['page']
    }, () => {
      if (chrome.runtime.lastError) {
        console.log('Context menu already exists or error:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error('Error creating context menu:', error);
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'logActivity') {
    console.log('Activity:', request.data);
    sendResponse({ success: true });
  }
  
  return true;
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fillCurrentForm') {
    chrome.tabs.sendMessage(tab.id, { action: 'fillForm' }).catch(err => {
      console.error('Error sending message to tab:', err);
    });
  }
});

console.log('Background service worker loaded successfully');
