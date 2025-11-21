// Background service worker

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
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
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'logActivity') {
    console.log('Activity:', request.data);
    sendResponse({ success: true });
  }
  
  return true;
});

// Context menu for quick actions (right-click menu)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fillCurrentForm',
    title: 'Fill this form with Smart Autofill',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fillCurrentForm') {
    chrome.tabs.sendMessage(tab.id, { action: 'fillForm' });
  }
});

console.log('Background service worker loaded');
