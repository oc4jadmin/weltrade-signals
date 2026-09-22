// Popup script for Weltrade Price Extractor

const DEFAULT_URL = 'http://localhost:3000';
let isExtracting = false;
let currentUrl = DEFAULT_URL;

const SYMBOLS = ['FXVOL99', 'FXVOL80', 'FXVOL60', 'FXVOL40', 'FXVOL20'];

// Elements
const dashboardUrlInput = document.getElementById('dashboard-url');
const dashboardStatus = document.getElementById('dashboard-status');
const lastUpdate = document.getElementById('last-update');
const symbolsCount = document.getElementById('symbols-count');
const pricesList = document.getElementById('prices-list');
const connectBtn = document.getElementById('connect-btn');

// Format time
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour12: false });
}

// Update prices display
function updatePricesDisplay(prices) {
  if (!prices || prices.length === 0) {
    pricesList.innerHTML = '<div style="color: #64748b; font-size: 12px;">No prices detected yet</div>';
    return;
  }
  
  pricesList.innerHTML = prices.map(p => `
    <div class="price-item">
      <span class="price-symbol">${p.symbol}</span>
      <div class="price-values">
        <span class="price-bid">${p.bid.toFixed(5)}</span>
        <span style="color: #64748b;"> / </span>
        <span class="price-ask">${p.ask.toFixed(5)}</span>
      </div>
    </div>
  `).join('');
  
  symbolsCount.textContent = prices.length;
}

// Check dashboard status
async function checkDashboard() {
  try {
    const url = currentUrl.replace(/\/$/, ''); // Remove trailing slash
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      dashboardStatus.textContent = 'Connected';
      dashboardStatus.className = 'status-value connected';
      return true;
    }
  } catch (e) {
    // Dashboard not running
  }
  
  dashboardStatus.textContent = 'Offline';
  dashboardStatus.className = 'status-value disconnected';
  return false;
}

// Toggle extraction
function toggleExtraction() {
  isExtracting = !isExtracting;
  
  if (isExtracting) {
    connectBtn.textContent = 'Stop Extraction';
    connectBtn.className = 'connect-btn active';
  } else {
    connectBtn.textContent = 'Start Extraction';
    connectBtn.className = 'connect-btn inactive';
  }
  
  // Send message to background
  chrome.runtime.sendMessage({
    type: isExtracting ? 'START_EXTRACTION' : 'STOP_EXTRACTION'
  });
}

// Save dashboard URL
async function saveDashboardUrl() {
  let url = dashboardUrlInput.value.trim();
  
  // Add default if empty
  if (!url) {
    url = DEFAULT_URL;
  }
  
  // Ensure proper format
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }
  
  // Remove trailing slash
  url = url.replace(/\/$/, '');
  
  currentUrl = url;
  
  // Update visual indicator
  if (url.includes('localhost')) {
    dashboardUrlInput.className = 'url-input local';
  } else {
    dashboardUrlInput.className = 'url-input vercel';
  }
  
  // Save to storage
  chrome.runtime.sendMessage({
    type: 'SET_DASHBOARD_URL',
    url: url
  });
  
  // Check connection
  checkDashboard();
}

// Get prices from storage
async function loadPrices() {
  const result = await chrome.storage.local.get(['latestPrices', 'lastUpdate']);
  
  if (result.latestPrices) {
    updatePricesDisplay(result.latestPrices);
    lastUpdate.textContent = formatTime(result.lastUpdate);
  }
  
  if (result.lastUpdate) {
    const age = Math.floor((Date.now() - result.lastUpdate) / 1000);
    if (age < 60) {
      lastUpdate.textContent = `${age}s ago`;
    } else {
      lastUpdate.textContent = formatTime(result.lastUpdate);
    }
  }
}

// Load saved URL
async function loadSavedUrl() {
  chrome.runtime.sendMessage({ type: 'GET_DASHBOARD_URL' }, (response) => {
    if (response && response.url) {
      currentUrl = response.url;
      dashboardUrlInput.value = response.url;
      
      if (response.url.includes('localhost')) {
        dashboardUrlInput.className = 'url-input local';
      } else {
        dashboardUrlInput.className = 'url-input vercel';
      }
    }
  });
}

// Event listeners
// Inject button instead of toggle
connectBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    if (!tab.url?.includes('weltrade')) {
      scanResult.textContent = 'Not on Weltrade page';
      return;
    }
    
    connectBtn.textContent = 'Injecting...';
    chrome.runtime.sendMessage({ type: 'INJECT_SCRIPT' }, (response) => {
      if (response?.injected) {
        connectBtn.textContent = 'Injected ✓';
        scanResult.textContent = 'Script injected. Re-scan in 3s...';
        setTimeout(() => scanBtn.click(), 3000);
      } else {
        connectBtn.textContent = 'Inject Failed ✗';
        scanResult.textContent = 'Injection failed. Try refreshing the page.';
      }
    });
  } catch (e) {
    scanResult.textContent = 'Error: ' + e.message;
  }
});
dashboardUrlInput.addEventListener('change', saveDashboardUrl);
dashboardUrlInput.addEventListener('blur', saveDashboardUrl);

// Debug scan button
const scanBtn = document.getElementById('scan-btn');
const scanResult = document.getElementById('scan-result');

scanBtn?.addEventListener('click', async () => {
  scanResult.textContent = 'Scanning...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      scanResult.textContent = 'No active tab';
      return;
    }
    
    if (!tab.url || !tab.url.includes('weltrade')) {
      scanResult.textContent = 'Not on a Weltrade page.\nCurrent URL: ' + tab.url;
      return;
    }
    
    // Try direct message first
    chrome.tabs.sendMessage(tab.id, { type: 'SCAN_NOW' }, async (response) => {
      if (chrome.runtime.lastError) {
        // Try injecting script
        scanResult.textContent = 'Injecting content script...';
        chrome.runtime.sendMessage({ type: 'INJECT_SCRIPT' }, (injectResp) => {
          if (injectResp?.injected) {
            scanResult.textContent = 'Injected! Re-scanning in 2s...';
            setTimeout(() => scanBtn.click(), 2000);
          } else {
            scanResult.textContent = 'Failed to inject script. Try:\n1. Refresh the Weltrade page (Ctrl+Shift+R)\n2. Make sure extension is enabled';
          }
        });
        return;
      }
      
      if (!response) {
        scanResult.textContent = 'No response from page';
        return;
      }
      
      const lines = [
        `URL: ${tab.url}`,
        `Body text: ${response.bodyTextLength} chars`,
        `Symbols on page: ${response.symbolsFound.join(', ') || 'NONE'}`,
        `Prices found: ${response.prices.length}`,
      ];
      
      response.prices.forEach(p => {
        lines.push(`  ${p.symbol}: bid=${p.bid} ask=${p.ask}`);
      });
      
      if (response.debugLog && response.debugLog.length > 0) {
        lines.push('--- Debug log ---');
        lines.push(...response.debugLog.slice(-5));
      }
      
      scanResult.textContent = lines.join('\n');
    });
  } catch (e) {
    scanResult.textContent = 'Error: ' + e.message;
  }
});

// Initialize
async function init() {
  await loadSavedUrl();
  await checkDashboard();
  await loadPrices();
  
  // Check dashboard periodically
  setInterval(checkDashboard, 5000);
  
  // Reload prices periodically
  setInterval(loadPrices, 2000);
}

init();
