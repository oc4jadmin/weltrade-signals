# Weltrade Synthetic Indices Signal Dashboard

Professional trading signal dashboard for Synthetic Indices on Weltrade broker.

## Features

### Scalping Signals
- **Timeframes**: M1, M5, M15
- **Indicators**: ZigZag + Stochastic (5,3,3)
- **Fast-paced trading opportunities**

### Intraday Signals
- **Timeframes**: M30, H1
- **Indicators**: CHoCH, BOS, FVG (Smart Money Concept)
- **Higher probability setups**

### Notifications
- MT5 mobile app notifications
- Telegram bot integration
- Real-time signal alerts

## Tech Stack

- **Framework**: Next.js 14
- **Charts**: TradingView Lightweight Charts
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone or navigate to project
cd weltrade-signals

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Deployment

### Vercel (Recommended)

1. Create a [Vercel account](https://vercel.com)
2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Deploy:
   ```bash
   vercel
   ```
4. Follow the prompts

Or connect your GitHub repository to Vercel for automatic deployments.

### Netlify

1. Create a [Netlify account](https://netlify.com)
2. Connect your GitHub repository
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Deploy

### Railway

1. Create a [Railway account](https://railway.app)
2. New Project → Deploy from GitHub
3. Railway will auto-detect Next.js

### Cloudflare Pages

1. Create a [Cloudflare account](https://pages.cloudflare.com)
2. Connect your GitHub repository
3. Build command: `npm run build`
4. Output directory: `.next`

## Environment Variables

Create a `.env.local` file:

```env
# Telegram Bot (for production notifications)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# MT5 Connection (if using real data)
MT5_SERVER=your_server
MT5_PASSWORD=your_password
```

## Telegram Bot Setup

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. Search for `@userinfobot` to get your Chat ID
5. Enter both in the dashboard settings

## MT5 Integration

For real-time data from MT5:

1. Install MetaTrader 5 on your computer
2. Enable API in MT5 options
3. Install the MT5 Python package:
   ```bash
   pip install MetaTrader5
   ```
4. Create an EA (Expert Advisor) to send signals via webhook

## Project Structure

```
weltrade-signals/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── signals/      # Signal API routes
│   │   │   └── telegram/     # Telegram bot routes
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Main dashboard
│   │   └── globals.css       # Global styles
│   └── components/          # Reusable components
├── public/                  # Static assets
├── package.json
├── tailwind.config.ts
└── README.md
```

## Customization

### Adding New Symbols

Edit the `SYMBOLS` array in `src/app/page.tsx`:

```typescript
const SYMBOLS = [
  { name: "Your Index", symbol: "YOUR_INDEX", digits: 2 },
  // ...
];
```

### Changing Theme Colors

Edit `tailwind.config.ts`:

```typescript
colors: {
  primary: {
    500: '#your-color',
    // ...
  },
}
```

## License

MIT License - feel free to use and modify.
