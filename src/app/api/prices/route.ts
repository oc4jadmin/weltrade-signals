import { NextRequest, NextResponse } from 'next/server';

// In-memory store for real-time prices
let realTimePrices = {
  prices: [] as any[],
  lastUpdate: 0,
  lastHeartbeat: 0,
  source: ''
};

// Considered "live" if we got a heartbeat within last 10s
const LIVE_THRESHOLD_MS = 10000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = Date.now();
    
    if (body.prices && Array.isArray(body.prices)) {
      realTimePrices = {
        prices: body.prices,
        lastUpdate: now,
        lastHeartbeat: now,
        source: body.source || 'unknown'
      };
      
      return NextResponse.json({
        success: true,
        message: 'Prices received',
        count: body.prices.length,
        timestamp: now
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid price data' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error receiving prices:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const now = Date.now();
  const age = now - realTimePrices.lastHeartbeat;
  const isLive = age < LIVE_THRESHOLD_MS && realTimePrices.lastHeartbeat > 0;
  
  return NextResponse.json({
    prices: realTimePrices.prices,
    lastUpdate: realTimePrices.lastUpdate,
    lastHeartbeat: realTimePrices.lastHeartbeat,
    age: age,
    isLive: isLive,
    source: realTimePrices.source
  });
}