# Weltrade Signals Dashboard - Vercel Deployment Guide

## Prerequisites

- GitHub account (for connecting to Vercel)
- Vercel account (free at https://vercel.com)

---

## Step 1: Push Project to GitHub

### 1.1 Initialize Git (if not already done)

```bash
cd weltrade-signals
git init
git add .
git commit -m "Initial commit: Weltrade Signals Dashboard"
```

### 1.2 Create GitHub Repository

1. Go to https://github.com/new
2. Name it `weltrade-signals`
3. Make it Public or Private
4. Click "Create repository"

### 1.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/weltrade-signals.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### 2.1 Connect Vercel to GitHub

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Find your `weltrade-signals` repository
5. Click "Import"

### 2.2 Configure Project

1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `./` (default)
3. **Build Command**: `npm run build` (auto-filled)
4. **Output Directory**: `.next` (auto-filled)
5. Click "Deploy"

### 2.3 Wait for Deployment

Vercel will build and deploy automatically. This takes ~2-3 minutes.

### 2.4 Get Your URL

After deployment, you'll see a URL like:
```
https://weltrade-signals-xxx.vercel.app
```

**Save this URL!** You'll need it for the browser extension.

---

## Step 3: Configure Browser Extension

### 3.1 Update Extension

1. Go to `chrome://extensions/`
2. Find "Weltrade Price Extractor"
3. Click "Details"
4. Click "Extension options" or just click the extension icon

### 3.2 Set Dashboard URL

1. In the popup, find "Dashboard URL" field
2. Paste your Vercel URL, for example:
   ```
   https://weltrade-signals-xxx.vercel.app
   ```
3. Click outside the field or press Enter to save

### 3.3 Reload Extension

1. Go back to `chrome://extensions/`
2. Click "Reload" on the Weltrade Extractor card

---

## Step 4: Test the Setup

### 4.1 Open Weltrade Web Terminal

1. Open `https://secure.weltrade.com`
2. Login to your account
3. Make sure Web Terminal is loaded

### 4.2 Start Extraction

1. Click the Weltrade Extractor icon in Chrome toolbar
2. Make sure Dashboard URL shows "Connected"
3. Click "Start Extraction"
4. You should see prices appearing

### 4.3 Open Dashboard

1. Open your Vercel URL in a new tab
2. You should see "Live Data" badge in the header
3. Prices in the ticker should turn green

---

## Step 5: Custom Domain (Optional)

### 5.1 Add Domain in Vercel

1. Go to your project in Vercel
2. Click "Settings" → "Domains"
3. Enter your custom domain (e.g., `signals.yoursite.com`)
4. Click "Add"
5. Add the DNS records shown by Vercel to your domain provider

### 5.2 Update Extension

After DNS propagates, update the extension URL to your custom domain.

---

## Troubleshooting

### "Dashboard: Offline"

1. Check that Vercel deployment is successful (green status)
2. Verify the URL is correct in extension settings
3. Make sure dashboard is not sleeping (Vercel free tier sleeps after 30 min inactivity)

### "Dashboard: Connected" but no prices

1. Make sure Weltrade Web Terminal is open
2. Make sure you're logged in to Weltrade
3. Click "Start Extraction"
4. Wait a few seconds for prices to appear

### Extension not working

1. Make sure Weltrade Web Terminal page is fully loaded
2. Refresh the Weltrade page
3. Click "Start Extraction" again

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser Extension (Chrome)                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Weltrade Web Terminal (secure.weltrade.com)              │  │
│  │  content.js extracts prices every 1 second               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  background.js (service worker)                            │  │
│  │  Sends prices to Vercel dashboard API                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Vercel Cloud                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Next.js Dashboard (https://weltrade-signals-xxx.vercel.app) │
│  │  - Receives prices at /api/prices                        │  │
│  │  - Polls for prices every 2 seconds                     │  │
│  │  - Generates signals based on real Weltrade prices      │  │
│  │  - Displays dashboard UI                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Important Notes

### Vercel Sleep Mode

Vercel free tier puts projects to sleep after 30 minutes of inactivity. When you wake it up (by visiting the URL), it may take 10-20 seconds to start.

### Cold Start Delay

The first request after sleep may take longer. The extension will show "Offline" briefly during cold start.

### Keep Dashboard Awake (Optional)

To keep dashboard always ready:
- Upgrade to Vercel Pro (paid)
- Or use a free uptime monitoring service like UptimeRobot to ping your URL every 5 minutes

---

## Quick Reference

| Step | Command/Action |
|------|---------------|
| Push to GitHub | `git add . && git commit -m "update" && git push` |
| Vercel URL | https://vercel.com/dashboard |
| Extension Settings | chrome://extensions/ → Weltrade Extractor |
| Dashboard Health | `/api/health` endpoint |

---

## Support

If you encounter issues:
1. Check Vercel deployment logs for errors
2. Check browser console (F12) for extension errors
3. Verify Weltrade Web Terminal is loaded correctly
