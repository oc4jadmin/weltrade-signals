// Weltrade Price Extractor - Content Script
// Extracts real-time FX Vol prices from Weltrade Web Terminal

// Weltrade symbol format: "SFX Vol 99", "SFX Vol 80", "SFX Vol 60", "SFX Vol 40", "SFX Vol 20"
const SYMBOLS = [
  { display: 'SFX Vol 99', code: 'FXVOL99' },
  { display: 'SFX Vol 80', code: 'FXVOL80' },
  { display: 'SFX Vol 60', code: 'FXVOL60' },
  { display: 'SFX Vol 40', code: 'FXVOL40' },
  { display: 'SFX Vol 20', code: 'FXVOL20' },
];

let lastPrices = {};
let extractionInterval = null;

// Extract price from market watch
function extractPrices() {
  const prices = [];
  const priceData = {};

  // Helper: find symbol by display name in any element
  const findSymbolInText = (text) => {
    for (const sym of SYMBOLS) {
      if (text.includes(sym.display)) return sym;
    }
    return null;
  };

  // Method 1: Scan all elements, find ones containing "SFX Vol XX"
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    // Skip elements with too many children (containers, not leaves)
    if (el.children.length > 5) return;
    if (!el.textContent) return;

    const text = el.textContent || '';
    const sym = findSymbolInText(text);
    if (!sym) return;

    // Find numeric prices in same row or parent
    let scope = el;
    let depth = 0;
    while (scope && depth < 6) {
      const scopeText = scope.textContent || '';
      // Match decimals like 3646.26, 270101.52
      const numbers = scopeText.match(/\b\d{1,10}\.\d{2,5}\b/g);
      if (numbers && numbers.length >= 2) {
        // Take the first two reasonable numbers as bid/ask
        if (!priceData[sym.code]) {
          priceData[sym.code] = {
            symbol: sym.code,
            bid: parseFloat(numbers[0]),
            ask: parseFloat(numbers[1]),
            timestamp: Date.now()
          };
        }
        break;
      }
      scope = scope.parentElement;
      depth++;
    }
  });

  Object.values(priceData).forEach(p => prices.push(p));
  return prices;
}

// Send prices to background script
function sendPrices() {
  const prices = extractPrices();
  
  if (prices.length > 0) {
    // Store in localStorage for dashboard access
    try {
      localStorage.setItem('weltrade_prices', JSON.stringify({
        prices: prices,
        updated: Date.now()
      }));
    } catch (e) {
      console.log('Weltrade Extractor: Could not save to localStorage');
    }
    
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'PRICES_UPDATE',
      prices: prices
    });
    
    console.log('Weltrade Extractor: Sent', prices.length, 'prices');
  }
}

// Start extraction
function startExtraction() {
  if (extractionInterval) return;
  
  console.log('Weltrade Extractor: Starting price extraction...');
  sendPrices(); // Initial extraction
  extractionInterval = setInterval(sendPrices, 1000); // Every second
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_EXTRACTION') {
    startExtraction();
    sendResponse({ status: 'started' });
  }
  if (message.type === 'STOP_EXTRACTION') {
    if (extractionInterval) {
      clearInterval(extractionInterval);
      extractionInterval = null;
    }
    sendResponse({ status: 'stopped' });
  }
  if (message.type === 'GET_PRICES') {
    sendResponse({ prices: extractPrices() });
  }
});

// Auto-start when page loads
if (document.readyState === 'complete') {
  startExtraction();
} else {
  window.addEventListener('load', startExtraction);
}
