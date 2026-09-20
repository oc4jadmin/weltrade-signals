import { NextRequest, NextResponse } from "next/server";

// Generate mock signals for demonstration
function generateSignal() {
  const symbols = [
    { symbol: "VRTX75", name: "Volatility 75" },
    { symbol: "VRTX50", name: "Volatility 50" },
    { symbol: "VRTX25", name: "Volatility 25" },
    { symbol: "INDEX10", name: "Index 10" },
    { symbol: "RANGE80", name: "Range Break 80" },
  ];

  const timeframes = ["M1", "M5", "M15", "M30", "H1"];
  const smcPatterns = ["CHoCH", "BOS", "FVG", "OB"];
  const scalpingPatterns = ["ZigZag + Stochastic"];

  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
  const isBuy = Math.random() > 0.5;
  const entry = 100 + Math.random() * 50;
  const slDistance = timeframe === "H1" ? 30 : timeframe === "M30" ? 20 : 10;
  const tpDistance = timeframe === "H1" ? 60 : timeframe === "M30" ? 40 : 20;

  const isScalping = ["M1", "M5", "M15"].includes(timeframe);

  return {
    id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    symbol: symbol.symbol,
    type: isBuy ? "BUY" : "SELL",
    timeframe,
    entry: Number(entry.toFixed(2)),
    sl: Number((isBuy ? entry - slDistance : entry + slDistance).toFixed(2)),
    tp: Number((isBuy ? entry + tpDistance : entry - tpDistance).toFixed(2)),
    pip: Number((tpDistance / 10).toFixed(1)),
    timestamp: new Date().toISOString(),
    status: "ACTIVE",
    indicator: isScalping
      ? `${scalpingPatterns[0]} (5,3,3)`
      : `${smcPatterns[Math.floor(Math.random() * smcPatterns.length)]} (SMC)`,
    confidence: Math.floor(Math.random() * 20 + 80),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // 'scalping' | 'intraday' | 'all'
  const symbol = searchParams.get("symbol");

  // Generate signals
  let signals = Array.from({ length: 10 }, generateSignal);

  // Filter by type
  if (type === "scalping") {
    signals = signals.filter((s) => ["M1", "M5", "M15"].includes(s.timeframe));
  } else if (type === "intraday") {
    signals = signals.filter((s) => ["M30", "H1"].includes(s.timeframe));
  }

  // Filter by symbol
  if (symbol) {
    signals = signals.filter((s) => s.symbol === symbol);
  }

  // Sort by timestamp
  signals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    success: true,
    count: signals.length,
    signals,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, signal } = body;

    if (action === "create") {
      // Validate signal data
      if (!signal?.symbol || !signal?.type || !signal?.entry) {
        return NextResponse.json(
          { error: "Missing required signal fields" },
          { status: 400 }
        );
      }

      // Create new signal (in real app, save to database)
      const newSignal = {
        ...generateSignal(),
        ...signal,
        id: `signal-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: "ACTIVE",
      };

      return NextResponse.json({
        success: true,
        signal: newSignal,
      });
    }

    if (action === "update") {
      // Update signal status
      const { id, status } = body;

      if (!id || !status) {
        return NextResponse.json(
          { error: "Missing id or status" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        signal: { id, status },
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Signal API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
