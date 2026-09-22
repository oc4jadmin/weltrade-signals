import { NextRequest, NextResponse } from 'next/server';

// In-memory store for signals
let signals: any[] = [];
const MAX_SIGNALS = 100;

export async function POST(request: NextRequest) {
  try {
    const rawText = await request.text();
    const startIdx = rawText.indexOf('{');
    const endIdx = rawText.lastIndexOf('}');
    let jsonText = rawText;
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonText = rawText.substring(startIdx, endIdx + 1);
    }
    
    const body = JSON.parse(jsonText);
    
    if (!body.symbol || !body.type || !body.timeframe) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const newSignal = {
      id: `mt5-${body.symbol}-${body.timeframe}-${body.timestamp || Date.now()}`,
      symbol: body.symbol,
      type: body.type,
      timeframe: body.timeframe,
      entry: body.entry,
      sl: body.sl,
      tp1: body.tp1,
      tp2: body.tp2,
      tp3: body.tp3,
      pip: body.pip,
      indicator: body.indicator || 'MT5 EA',
      confidence: body.confidence || 80,
      timestamp: new Date((body.timestamp || Date.now()) * 1000),
      status: 'ACTIVE',
      source: body.source || 'mt5-ea',
    };
    
    // Avoid duplicate signals within 60 seconds
    const existingIndex = signals.findIndex(s => 
      s.symbol === newSignal.symbol && 
      s.timeframe === newSignal.timeframe && 
      s.type === newSignal.type &&
      newSignal.timestamp.getTime() - s.timestamp.getTime() < 60000
    );
    
    if (existingIndex === -1) {
      signals.unshift(newSignal);
      if (signals.length > MAX_SIGNALS) {
        signals = signals.slice(0, MAX_SIGNALS);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Signal received',
      count: signals.length
    });
  } catch (error) {
    console.error('Error receiving signal:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    signals: signals,
    count: signals.length
  });
}
