# Weltrade Price Extractor - Browser Extension

## Overview

This browser extension extracts real-time FX Vol prices from the Weltrade Web Terminal and sends them to the Weltrade Signals Dashboard.

## Features

- **Real-time price extraction** from Weltrade Web Terminal
- **Automatic connection** to dashboard when prices are detected
- **Live status indicator** showing connection status
- **Support for all FX Vol symbols**: FXVOL99, FXVOL80, FXVOL60, FXVOL40, FXVOL20

## Installation

### Step 1: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension` folder from this project

### Step 2: Configure Extension

1. Click the extension icon in Chrome toolbar
2. Make sure Weltrade Web Terminal is open and logged in at `secure.weltrade.com`
3. Click **Start Extraction**
4. The extension will automatically detect and extract FX Vol prices

### Step 3: Run Dashboard

1. Start the dashboard:
   ```bash
   cd weltrade-signals
   npm run dev
   ```

2. Open `http://localhost:3000`
3. You should see **"Live Data"** badge in the header
4. Prices in the ticker will turn green when receiving real data from Weltrade

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser Extension                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Weltrade Web Terminal (secure.weltrade.com)              ││
│  │  - Content Script extracts Bid/Ask prices                   ││
│  │  - Sends to Background Script every 1 second               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Background Script (service_worker)                         ││
│  │  - Receives prices from content script                     ││
│  │  - Forwards to Dashboard API                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Dashboard (localhost:3000)                                 ││
│  │  - API receives prices at /api/prices                       ││
│  │  - Dashboard polls for prices every 2 seconds               ││
│  │  - Signal generation uses real Weltrade prices             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Files

- `manifest.json` - Extension configuration (Manifest V3)
- `content.js` - Extracts prices from Weltrade Web Terminal page
- `background.js` - Service worker for communication
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic

## Troubleshooting

### Extension not extracting prices?

1. Make sure Weltrade Web Terminal is open at `secure.weltrade.com`
2. Make sure you're logged in to your Weltrade account
3. Click the extension icon and check if prices are detected
4. Try refreshing the Weltrade page

### Dashboard not showing "Live Data"?

1. Make sure dashboard is running (`npm run dev`)
2. Make sure extension is installed and active
3. Click Start Extraction in extension popup
4. Check browser console for errors

### Cross-Origin issues?

The extension needs these host permissions:
- `https://secure.weltrade.com/*` - To access Weltrade Web Terminal
- `http://localhost:3000/*` - To send prices to dashboard

## Security Notes

- All data stays local on your machine
- No external servers involved
- Prices are only sent to your local dashboard
- Extension only reads visible page content
