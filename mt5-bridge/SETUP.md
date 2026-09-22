# MT5 EA Setup Guide

## Step 1: Copy EA to MT5
1. Open MT5 → File → Open Data Folder
2. Navigate to `MQL5/Experts/`
3. Copy `WeltradePriceSender.mq5` ke folder tu

## Step 2: Compile EA
1. In MT5, press F4 (MetaEditor)
2. File → Open → Select `WeltradePriceSender.mq5`
3. Click "Compile" (F7)
4. Pastikan "0 errors, 0 warnings"

## Step 3: Enable WebRequest
1. MT5 → Tools → Options → Expert Advisors
2. Enable: **Allow WebRequest for listed URL**
3. Add: `https://weltrade-signals.vercel.app`
4. Click OK

## Step 4: Run EA
1. In MT5 Navigator (left panel), find "Expert Advisors"
2. Drag "WeltradePriceSender" ke chart FX Vol 99
3. Enable "Allow automated trading"
4. OK

## Step 5: Verify
- Check MT5 "Experts" tab - patut ada log "Sent prices successfully"
- Check dashboard: https://weltrade-signals.vercel.app
- Status patut "Online" dengan harga real

## Troubleshooting
- **WebRequest error**: Pastikan URL dah add dalam Options
- **No prices**: Pastikan symbols ada dalam Market Watch
- **EA not starting**: Check "Allow automated trading" enabled

## Auto-start (Optional)
1. MT5 → Tools → Options → Charts
2. Enable "Save chart data as default"
3. EA akan auto-attach bila MT5 buka