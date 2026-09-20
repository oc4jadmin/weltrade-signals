import { NextRequest, NextResponse } from 'next/server';

// In-memory store for real-time prices
let realTimePrices = {
  prices: [] as any[],
  lastUpdate: 0,
  source: ''
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.prices && Array.isArray(body.prices)) {
      realTimePrices = {
        prices: body.prices,
        lastUpdate: Date.now(),
        source: body.source || 'unknown'
      };
      
      return NextResponse.json({
        success: true,
        message: 'Prices received',
        count: body.prices.length,
        timestamp: realTimePrices.lastUpdate
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
  return NextResponse.json({
    prices: realTimePrices.prices,
    lastUpdate: realTimePrices.lastUpdate,
    source: realTimePrices.source,
    age: Date.now() - realTimePrices.lastUpdate
  });
}
