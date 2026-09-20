// Weltrade Price Extractor - Content Script
// Extracts real-time FX Vol prices from Weltrade Web Terminal

const SYMBOLS = [
  'FXVOL99', 'FXVOL80', 'FXVOL60', 'FXVOL40', 'FXVOL20'
];

let lastPrices = {};
let extractionInterval = null;

// Extract price from market watch
function extractPrices() {
  const prices = [];
  
  // Method 1: Try to find in market watch table
  const rows = document.querySelectorAll('.market-watch-row, .symbol-item, [class*="market"] [class*="symbol"]');
  
  rows.forEach(row => {
    const text = row.textContent || '';
    
    SYMBOLS.forEach(symbol => {
      if (text.includes(symbol)) {
        // Try to extract bid/ask prices
        const bidMatch = text.match(/Bid[:\s]*([\d.]+)/i);
        const askMatch = text.match(/Ask[:\s]*([\d.]+)/i);
        
        if (bidMatch && askMatch) {
          prices.push({
            symbol: symbol,
            bid: parseFloat(bidMatch[1]),
            ask: parseFloat(askMatch[1]),
            timestamp: Date.now()
          });
        }
      }
    });
  });
  
  // Method 2: Try to find in chart header or symbol display
  const chartSymbol = document.querySelector('.chart-symbol, .symbol-name, [class*="chart"] [class*="symbol"]');
  if (chartSymbol) {
    const symbolText = chartSymbol.textContent || '';
    const bidEl = document.querySelector('.bid-price, .price-bid, [class*="bid"]');
    const askEl = document.querySelector('.ask-price, .price-ask, [class*="ask"]');
    
    if (bidEl && askEl) {
      const bid = parseFloat(bidEl.textContent);
      const ask = parseFloat(askEl.textContent);
      
      SYMBOLS.forEach(symbol => {
        if (symbolText.includes(symbol)) {
          prices.push({
            symbol: symbol,
            bid: bid,
            ask: ask,
            timestamp: Date.now()
          });
        }
      });
    }
  }
  
  // Method 3: Try to find in any element with price data
  const allElements = document.querySelectorAll('*');
  const priceData = {};
  
  allElements.forEach(el => {
    const text = el.textContent || '';
    
    SYMBOLS.forEach(symbol => {
      if (text.includes(symbol) && !priceData[symbol]) {
        // Look for numbers near the symbol
        const parentText = el.parentElement?.textContent || '';
        const numbers = parentText.match(/[\d]+\.[\d]+/g);
        
        if (numbers && numbers.length >= 2) {
          // Assume first two numbers are bid and ask
          priceData[symbol] = {
            symbol: symbol,
            bid: parseFloat(numbers[0]),
            ask: parseFloat(numbers[1]),
            timestamp: Date.now()
          };
        }
      }
    });
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
