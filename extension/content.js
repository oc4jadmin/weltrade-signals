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

let extractionInterval = null;
let extractionCount = 0;
let debugLog = [];

// Extract price by walking text nodes
function extractPrices() {
  const prices = [];
  const found = {};

  // Use TreeWalker to visit all text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent || '';
    if (text.trim().length > 0) {
      textNodes.push({ node, text: text.trim() });
    }
  }

  // For each text node, check if it contains a symbol
  textNodes.forEach(({ node, text }) => {
    for (const sym of SYMBOLS) {
      if (text.includes(sym.display) && !found[sym.code]) {
        // Walk up to find a container with price numbers
        let scope = node.parentElement;
        let depth = 0;
        while (scope && depth < 10) {
          const scopeText = scope.textContent || '';
          // Match decimals - prices typically have 2-5 decimals
          const numbers = scopeText.match(/\b\d{1,10}\.\d{2,5}\b/g);
          if (numbers && numbers.length >= 2) {
            const validNumbers = numbers
              .map(n => parseFloat(n))
              .filter(n => n > 0.01 && n < 10000000);
            if (validNumbers.length >= 2) {
              found[sym.code] = {
                symbol: sym.code,
                bid: validNumbers[0],
                ask: validNumbers[1],
                timestamp: Date.now()
              };
              debugLog.push(`${sym.display} → bid:${validNumbers[0]} ask:${validNumbers[1]}`);
              if (debugLog.length > 20) debugLog.shift();
            }
            break;
          }
          scope = scope.parentElement;
          depth++;
        }
      }
    }
  });

  extractionCount++;
  Object.values(found).forEach(p => prices.push(p));
  
  if (extractionCount % 10 === 0) {
    console.log(`[Weltrade Extractor] Scan #${extractionCount}: found ${prices.length} symbols`, debugLog.slice(-5));
  }
  
  return prices;
}

// Send prices to background script
function sendPrices() {
  const prices = extractPrices();
  
  // Always send heartbeat even if no prices, to keep connection alive
  const message = {
    type: 'PRICES_UPDATE',
    prices: prices,
    timestamp: Date.now(),
    active: true
  };
  
  // Always send heartbeat so dashboard knows extension is alive
  try {
    chrome.runtime.sendMessage(message).catch(() => {});
  } catch (e) {}
  
  if (prices.length > 0) {
    try {
      localStorage.setItem('weltrade_prices', JSON.stringify({
        prices: prices,
        updated: Date.now()
      }));
    } catch (e) {}
  }
}

// Scan current page and return results (for manual debug)
function scanNow() {
  const prices = extractPrices();
  const symbolsOnPage = [];
  
  // Also scan for any "SFX Vol" references
  const bodyText = document.body.textContent || '';
  SYMBOLS.forEach(sym => {
    if (bodyText.includes(sym.display)) {
      symbolsOnPage.push(sym.display);
    }
  });
  
  return {
    prices: prices,
    symbolsFound: symbolsOnPage,
    debugLog: debugLog.slice(-10),
    bodyTextLength: bodyText.length
  };
}

// Start extraction
function startExtraction() {
  if (extractionInterval) return;
  
  console.log('[Weltrade Extractor] Starting...');
  console.log('[Weltrade Extractor] Page URL:', window.location.href);
  
  // Initial scan to log what we see
  setTimeout(() => {
    const initial = scanNow();
    console.log('[Weltrade Extractor] Initial scan:', initial);
  }, 2000);
  
  sendPrices();
  extractionInterval = setInterval(sendPrices, 1000);
}

// Listen for messages from background/popup
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
  if (message.type === 'SCAN_NOW') {
    sendResponse(scanNow());
  }
});

// Auto-start
if (document.readyState === 'complete') {
  startExtraction();
} else {
  window.addEventListener('load', () => {
    setTimeout(startExtraction, 1000);
  });
}
