// Weltrade Price Extractor v1.4
// Extracts real-time FX Vol prices from Weltrade Web Terminal

const SYMBOLS = [
  { display: 'SFX Vol 99', code: 'FXVOL99' },
  { display: 'SFX Vol 80', code: 'FXVOL80' },
  { display: 'SFX Vol 60', code: 'FXVOL60' },
  { display: 'SFX Vol 40', code: 'FXVOL40' },
  { display: 'SFX Vol 20', code: 'FXVOL20' },
];

let extractionInterval = null;

// Simple extraction - scan all text nodes for symbols and nearby numbers
function extractPrices() {
  const results = [];
  const seen = new Set();
  
  // Get all text nodes in document
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
  
  // For each text node, check for symbol match
  for (const { node, text } of textNodes) {
    for (const sym of SYMBOLS) {
      if (text.includes(sym.display) && !seen.has(sym.code)) {
        // Found symbol - look for price numbers in parent elements
        let scope = node.parentElement;
        let depth = 0;
        
        while (scope && depth < 8) {
          const scopeText = scope.textContent || '';
          const numbers = scopeText.match(/\b\d{1,10}\.\d{2,5}\b/g);
          
          if (numbers && numbers.length >= 2) {
            const nums = numbers
              .map(n => parseFloat(n))
              .filter(n => n > 0.01 && n < 10000000);
            
            if (nums.length >= 2) {
              results.push({
                symbol: sym.code,
                bid: nums[0],
                ask: nums[1],
                timestamp: Date.now()
              });
              seen.add(sym.code);
            }
            break;
          }
          scope = scope.parentElement;
          depth++;
        }
      }
    }
  }
  
  return results;
}

// Send prices to background
function sendPrices() {
  const prices = extractPrices();
  
  if (chrome.runtime?.id) {
    chrome.runtime.sendMessage({
      type: 'PRICES_UPDATE',
      prices: prices,
      timestamp: Date.now()
    }).catch(() => {});
  }
}

// Start extraction
function startExtraction() {
  if (extractionInterval) return;
  
  console.log('[Weltrade] Starting price extraction...');
  
  // Log what we find
  setTimeout(() => {
    const prices = extractPrices();
    console.log('[Weltrade] Found', prices.length, 'symbols:', prices.map(p => `${p.symbol}=${p.bid}/${p.ask}`));
    
    // Also check what text contains "SFX"
    const allText = document.body.textContent || '';
    const sfxCount = (allText.match(/SFX Vol \d+/g) || []).length;
    console.log('[Weltrade] SFX matches in page text:', sfxCount);
  }, 2000);
  
  sendPrices();
  extractionInterval = setInterval(sendPrices, 1000);
}

// Listen for messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_EXTRACTION') {
    startExtraction();
    sendResponse({ status: 'started' });
  }
  if (msg.type === 'STOP_EXTRACTION') {
    if (extractionInterval) {
      clearInterval(extractionInterval);
      extractionInterval = null;
    }
    sendResponse({ status: 'stopped' });
  }
  if (msg.type === 'SCAN_NOW') {
    const prices = extractPrices();
    const allText = document.body.textContent || '';
    const sfxMatches = allText.match(/SFX Vol \d+/g) || [];
    sendResponse({
      prices: prices,
      symbolsFound: sfxMatches,
      bodyLength: allText.length
    });
  }
});

// Mark as loaded for debugging
window.__weltradeExtLoaded = true;
console.log('[Weltrade] Content script loaded at', new Date().toISOString());

// Auto-start with retry
function tryStart() {
  if (document.body) {
    startExtraction();
  } else {
    setTimeout(tryStart, 500);
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  tryStart();
} else {
  window.addEventListener('DOMContentLoaded', tryStart);
  window.addEventListener('load', tryStart);
}