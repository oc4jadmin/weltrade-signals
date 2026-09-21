// Weltrade Price Extractor - Background Script
// Handles communication between content script and dashboard API

const DEFAULT_DASHBOARD_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/prices';

let latestPrices = {};
let isRunning = false;
let dashboardUrl = DEFAULT_DASHBOARD_URL;

// Get dashboard URL from storage
async function getDashboardUrl() {
  const result = await chrome.storage.local.get(['dashboardUrl']);
  return result.dashboardUrl || DEFAULT_DASHBOARD_URL;
}

// Set dashboard URL
async function setDashboardUrl(url) {
  dashboardUrl = url;
  await chrome.storage.local.set({ dashboardUrl: url });
}

// Update badge to show status
function updateBadge(status) {
  if (status === 'connected') {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' }); // Green
  } else if (status === 'error') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // Red
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Send prices to dashboard API
async function sendToDashboard(prices) {
  try {
    const url = await getDashboardUrl();
    const response = await fetch(`${url}${API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prices: prices,
        source: 'browser-extension',
        timestamp: Date.now()
      })
    });
    
    if (response.ok) {
      updateBadge('connected');
      console.log('Weltrade Extractor: Prices sent to dashboard');
    } else {
      updateBadge('error');
      console.error('Weltrade Extractor: Failed to send prices');
    }
  } catch (error) {
    // Dashboard might not be running, that's ok
    console.log('Weltrade Extractor: Dashboard not available at', dashboardUrl);
    updateBadge('error');
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRICES_UPDATE') {
    latestPrices = message.prices || [];
    const now = Date.now();
    
    // Send to dashboard (even if empty, keep heartbeat)
    sendToDashboard(message.prices || []);
    
    // Store in extension storage
    chrome.storage.local.set({
      latestPrices: message.prices || [],
      lastUpdate: now,
      lastHeartbeat: now
    });
    
    console.log('[Background] Received', (message.prices || []).length, 'prices, sent to dashboard');
    
    sendResponse({ received: true });
  }
  
  if (message.type === 'GET_STATUS') {
    sendResponse({
      isRunning: isRunning,
      pricesCount: Object.keys(latestPrices).length,
      dashboardUrl: dashboardUrl
    });
  }
  
  if (message.type === 'SET_DASHBOARD_URL') {
    setDashboardUrl(message.url);
    sendResponse({ success: true, url: message.url });
  }
  
  if (message.type === 'GET_DASHBOARD_URL') {
    getDashboardUrl().then(url => sendResponse({ url }));
    return true; // Async response
  }
});

// Inject content script on demand (for already-open tabs)
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    console.log('Weltrade Extractor: Content script injected into tab', tabId);
    return true;
  } catch (e) {
    console.error('Weltrade Extractor: Failed to inject script', e.message);
    return false;
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // Try to send message; if fails, inject then retry
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'START_EXTRACTION' });
  } catch (e) {
    const ok = await injectContentScript(tab.id);
    if (ok) {
      // Wait a moment then send message
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: 'START_EXTRACTION' }).catch(() => {});
      }, 500);
    }
  }
});

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('Weltrade Price Extractor installed!');
  updateBadge(null);
});

// Also handle messages requesting script injection
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INJECT_SCRIPT') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const ok = await injectContentScript(tabs[0].id);
        sendResponse({ injected: ok });
      } else {
        sendResponse({ injected: false, error: 'No active tab' });
      }
    });
    return true;
  }
});
