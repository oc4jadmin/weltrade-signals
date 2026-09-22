// Weltrade Price Extractor - Background Script
// Handles communication between content script and dashboard API

const DEFAULT_DASHBOARD_URL = 'https://weltrade-signals.vercel.app';
const API_ENDPOINT = '/api/prices';

let latestPrices = [];
let dashboardUrl = DEFAULT_DASHBOARD_URL;

// Get dashboard URL from storage
async function getDashboardUrl() {
  const result = await chrome.storage.local.get(['dashboardUrl']);
  return result.dashboardUrl || DEFAULT_DASHBOARD_URL;
}

// Update badge to show status
function updateBadge(status) {
  if (status === 'connected') {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  } else if (status === 'error') {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prices: prices,
        source: 'browser-extension',
        timestamp: Date.now()
      })
    });
    
    if (response.ok) {
      updateBadge('connected');
    } else {
      updateBadge('error');
    }
  } catch (error) {
    updateBadge('error');
  }
}

// Inject content script programmatically with MAIN world
async function injectScript(tabId) {
  try {
    // Try MAIN world first (bypasses some page restrictions)
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js'],
      world: 'MAIN'
    });
    console.log('[Background] Content script injected (MAIN world) into tab', tabId);
    return true;
  } catch (e) {
    console.log('[Background] MAIN world failed, trying ISOLATED:', e.message);
    
    // Fallback to ISOLATED world
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js'],
        world: 'ISOLATED'
      });
      console.log('[Background] Content script injected (ISOLATED world) into tab', tabId);
      return true;
    } catch (e2) {
      console.error('[Background] Both injection methods failed:', e2.message);
      return false;
    }
  }
}

// Listen for tab updates - inject when Weltrade page loads
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('secure.weltrade.com')) {
    console.log('[Background] Weltrade page loaded, injecting script...');
    await injectScript(tabId);
  }
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRICES_UPDATE') {
    latestPrices = message.prices || [];
    
    // Store locally
    chrome.storage.local.set({
      latestPrices: latestPrices,
      lastUpdate: Date.now()
    });
    
    // Send to dashboard
    sendToDashboard(latestPrices);
    
    sendResponse({ received: true });
  }
  
  if (message.type === 'GET_STATUS') {
    sendResponse({
      isRunning: true,
      pricesCount: latestPrices.length,
      dashboardUrl: dashboardUrl
    });
  }
  
  if (message.type === 'SET_DASHBOARD_URL') {
    dashboardUrl = message.url;
    chrome.storage.local.set({ dashboardUrl: message.url });
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_DASHBOARD_URL') {
    sendResponse({ url: dashboardUrl });
  }
  
  if (message.type === 'INJECT_SCRIPT') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const ok = await injectScript(tabs[0].id);
        sendResponse({ injected: ok });
      }
    });
    return true;
  }
});

// Handle icon click - inject if needed
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes('secure.weltrade.com')) {
    await injectScript(tab.id);
  }
});

console.log('[Background] Weltrade Extractor background script loaded');