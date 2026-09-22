"use client";

import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Activity,
  Settings,
  TrendingUp,
  TrendingDown,
  Zap,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  RefreshCw,
  Check,
  X,
  Send,
  MessageCircle,
  Bell,
  AlertTriangle,
  BarChart3,
  Power,
} from "lucide-react";

// Types
type SignalStatus = "ACTIVE" | "HIT_TP1" | "HIT_TP2" | "HIT_TP3" | "HIT_SL" | "EXPIRED";

interface Signal {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  timeframe: string;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  pip: number;
  timestamp: Date;
  status: SignalStatus;
  indicator: string;
  confidence: number;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

interface MT5Config {
  server: string;
  connected: boolean;
}

// Synthetic Indices symbols - Weltrade FX VOL
const SYMBOLS = [
  { name: "FX VOL 99", symbol: "FXVOL99", digits: 2 },
  { name: "FX VOL 80", symbol: "FXVOL80", digits: 2 },
  { name: "FX VOL 60", symbol: "FXVOL60", digits: 2 },
  { name: "FX VOL 40", symbol: "FXVOL40", digits: 2 },
  { name: "FX VOL 20", symbol: "FXVOL20", digits: 2 },
];

// Generate mock price data
const generatePriceData = (basePrice: number, count: number) => {
  const data: Array<{ time: number; open: number; high: number; low: number; close: number }> = [];
  let price = basePrice;
  const now = Date.now();
  // Scale volatility based on price magnitude (~0.05% per minute)
  const vol = Math.max(basePrice * 0.0005, 0.1);
  for (let i = count; i >= 0; i--) {
    const change = (Math.random() - 0.5) * vol * 2;
    price = Math.max(price + change, basePrice * 0.95);
    data.push({
      time: Math.floor((now - i * 60000) / 1000),
      open: price,
      high: price + Math.random() * vol,
      low: price - Math.random() * vol,
      close: price + (Math.random() - 0.5) * vol,
    });
  }
  return data;
};

// Generate mock signals
const generateSignals = (): Signal[] => {
  const signals: Signal[] = [];
  const now = Date.now();

  // Scalping signals (M15, M5, M1)
  const scalpingTimeframes = ["M1", "M5", "M15"];
  scalpingTimeframes.forEach((tf, idx) => {
    const count = 3 - idx;
    for (let i = 0; i < count; i++) {
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const isBuy = Math.random() > 0.5;
      const entry = 100 + Math.random() * 50;
      const slDist = 8 + Math.random() * 4;
      const tp1Dist = 10 + Math.random() * 5;
      const tp2Dist = 18 + Math.random() * 8;
      const tp3Dist = 28 + Math.random() * 12;
      signals.push({
        id: `scalp-${tf}-${i}-${now}`,
        symbol: symbol.symbol,
        type: isBuy ? "BUY" : "SELL",
        timeframe: tf,
        entry: Number(entry.toFixed(2)),
        sl: Number((isBuy ? entry - slDist : entry + slDist).toFixed(2)),
        tp1: Number((isBuy ? entry + tp1Dist : entry - tp1Dist).toFixed(2)),
        tp2: Number((isBuy ? entry + tp2Dist : entry - tp2Dist).toFixed(2)),
        tp3: Number((isBuy ? entry + tp3Dist : entry - tp3Dist).toFixed(2)),
        pip: Number((Math.random() * 20 + 5).toFixed(1)),
        timestamp: new Date(now - i * 60000 * (15 - idx * 5)),
        status: Math.random() > 0.3 ? "ACTIVE" : (Math.random() > 0.5 ? "HIT_TP1" : "HIT_SL"),
        indicator: "ZigZag + Stochastic (5,3,3)",
        confidence: Math.floor(Math.random() * 20 + 80),
      });
    }
  });

  // Intraday signals (M30, H1)
  const intradayTimeframes = ["M30", "H1"];
  intradayTimeframes.forEach((tf, tfIdx) => {
    for (let i = 0; i < 4; i++) {
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const isBuy = Math.random() > 0.5;
      const entry = 100 + Math.random() * 50;
      const slDist = 15 + Math.random() * 8;
      const tp1Dist = 20 + Math.random() * 10;
      const tp2Dist = 35 + Math.random() * 15;
      const tp3Dist = 50 + Math.random() * 20;
      const smcPatterns = ["CHoCH", "BOS", "FVG", "OB"];
      signals.push({
        id: `intra-${tf}-${i}-${now}`,
        symbol: symbol.symbol,
        type: isBuy ? "BUY" : "SELL",
        timeframe: tf,
        entry: Number(entry.toFixed(2)),
        sl: Number((isBuy ? entry - slDist : entry + slDist).toFixed(2)),
        tp1: Number((isBuy ? entry + tp1Dist : entry - tp1Dist).toFixed(2)),
        tp2: Number((isBuy ? entry + tp2Dist : entry - tp2Dist).toFixed(2)),
        tp3: Number((isBuy ? entry + tp3Dist : entry - tp3Dist).toFixed(2)),
        pip: Number((Math.random() * 40 + 20).toFixed(1)),
        timestamp: new Date(now - i * 60000 * (30 - tfIdx * 10)),
        status: ["ACTIVE", "HIT_TP1", "HIT_TP2", "HIT_TP3", "HIT_SL"][Math.floor(Math.random() * 5)] as SignalStatus,
        indicator: smcPatterns[Math.floor(Math.random() * smcPatterns.length)] + " (SMC)",
        confidence: Math.floor(Math.random() * 15 + 85),
      });
    }
  });

  return signals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// Sidebar Component
const Sidebar = ({
  activeTab,
  setActiveTab,
  unreadCount,
  extensionConnected,
  pricesCount,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadCount: number;
  extensionConnected: boolean;
  pricesCount: number;
}) => {
  const menuItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "signals", icon: BarChart3, label: "Signals" },
    { id: "telegram", icon: Send, label: "Telegram Bot" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="w-64 bg-dark-300 border-r border-slate-700/50 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Weltrade</h1>
            <p className="text-xs text-slate-400">Synthetic Indices</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === item.id
                    ? "bg-primary-600 text-white"
                    : "text-slate-400 hover:bg-dark-100 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.id === "signals" && unreadCount > 0 && (
                  <span className="ml-auto bg-danger text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="bg-dark-100 rounded-lg p-4">
          {/* Extension Connection */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Browser Extension</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${extensionConnected ? "bg-success signal-live" : "bg-slate-500"}`}></div>
              <span className={`text-xs ${extensionConnected ? "text-success" : "text-slate-500"}`}>
                {extensionConnected ? `Live (${pricesCount})` : "Disconnected"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Data Source</span>
            <span className="text-xs text-warning">Weltrade Web</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Telegram</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-xs text-success">Active</span>
            </div>
          </div>
        </div>
        
        {/* Extension Install Guide */}
        {!extensionConnected && (
          <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-xs text-warning font-medium mb-1">Extension Required</p>
            <p className="text-xs text-slate-400">
              Install browser extension to get real Weltrade prices
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

// Price Ticker Component
const PriceTicker = ({ realPrices }: { realPrices: Record<string, { bid: number; ask: number }> }) => {
  const [mockPrices, setMockPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const initialPrices: Record<string, number> = {};
    SYMBOLS.forEach((s) => {
      initialPrices[s.symbol] = 100 + Math.random() * 50;
    });
    setMockPrices(initialPrices);

    const interval = setInterval(() => {
      setMockPrices((prev) => {
        const updated = { ...prev };
        SYMBOLS.forEach((s) => {
          const change = (Math.random() - 0.5) * 0.5;
          updated[s.symbol] = Math.max(updated[s.symbol] + change, 50);
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-5 gap-3 p-4 bg-dark-300 border-b border-slate-700/50">
      {SYMBOLS.slice(0, 5).map((symbol) => {
        const realPrice = realPrices[symbol.symbol];
        const displayPrice = realPrice ? (realPrice.bid + realPrice.ask) / 2 : mockPrices[symbol.symbol];
        const isReal = !!realPrice;
        
        return (
          <div
            key={symbol.symbol}
            className={`bg-dark-100 rounded-lg p-3 text-center ${isReal ? "ring-1 ring-success/50" : ""}`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">{symbol.symbol}</p>
              {isReal && (
                <div className="w-1.5 h-1.5 rounded-full bg-success signal-live"></div>
              )}
            </div>
            <p className={`text-lg font-bold ${isReal ? "text-success" : "text-white"}`}>
              {displayPrice?.toFixed(2) || "---"}
            </p>
            {isReal && realPrice && (
              <div className="flex justify-between text-xs mt-1">
                <span className="text-success">B:{realPrice.bid.toFixed(2)}</span>
                <span className="text-danger">A:{realPrice.ask.toFixed(2)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Chart Component
const ChartPanel = ({ symbol, realPrices }: { symbol: string; realPrices?: Record<string, { bid: number; ask: number }> }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const lastPriceRef = useRef<{ price: number; time: number; openPrice: number; highPrice: number; lowPrice: number } | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("M5");

  // Persist candle history per symbol+timeframe
  const [candleHistory, setCandleHistory] = useState<Record<string, Array<{ time: number; open: number; high: number; low: number; close: number }>>>({});

  // Convert timeframe to seconds
  const timeframeSeconds = {
    M1: 60,
    M5: 300,
    M15: 900,
    M30: 1800,
    H1: 3600,
    H4: 14400,
  }[selectedTimeframe] || 300;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const loadChart = async () => {
      const { createChart, ColorType } = await import("lightweight-charts");
      const chart = createChart(chartContainerRef.current!, {
        layout: {
          background: { type: ColorType.Solid, color: "#1e293b" },
          textColor: "#94a3b8",
        },
        grid: {
          vertLines: { color: "#334155" },
          horzLines: { color: "#334155" },
        },
        crosshair: {
          mode: 1,
          vertLine: { color: "#64748b", labelBackgroundColor: "#475569" },
          horzLine: { color: "#64748b", labelBackgroundColor: "#475569" },
        },
        rightPriceScale: {
          borderColor: "#334155",
        },
        timeScale: {
          borderColor: "#334155",
          timeVisible: true,
          rightOffset: 12,
          barSpacing: 8,
          fixLeftEdge: true,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });

      // Use real price if available, else mock base
      const realPrice = realPrices?.[symbol];
      const basePrice = realPrice
        ? (realPrice.bid + realPrice.ask) / 2
        : 100 + Math.random() * 50;

      // Try to load persisted history for this symbol+timeframe
      const historyKey = `${symbol}-${selectedTimeframe}`;
      const persistedHistory = candleHistory[historyKey];
      
      let data: Array<{ time: number; open: number; high: number; low: number; close: number }>;
      
      if (persistedHistory && persistedHistory.length > 0) {
        data = [...persistedHistory];
        // Update last candle to current real price
        const last = data[data.length - 1];
        const midReal = realPrice ? (realPrice.bid + realPrice.ask) / 2 : last.close;
        last.close = midReal;
        last.high = Math.max(last.high, midReal);
        last.low = Math.min(last.low, midReal);
      } else {
        // Generate initial historical data ending at current real price
        data = generatePriceData(basePrice, 200);
        if (data.length > 0) {
          const last = data[data.length - 1];
          const midReal = realPrice ? (realPrice.bid + realPrice.ask) / 2 : basePrice;
          last.close = midReal;
          last.high = Math.max(last.high, midReal);
          last.low = Math.min(last.low, midReal);
          last.time = Math.floor(last.time / timeframeSeconds) * timeframeSeconds;
        }
      }
      
      candleSeries.setData(data as any);
      
      // Init lastPriceRef from last historical candle
      if (data.length > 0) {
        const last = data[data.length - 1];
        lastPriceRef.current = {
          price: last.close,
          time: last.time,
          openPrice: last.open,
          highPrice: last.high,
          lowPrice: last.low,
        };
      }

      // Add volume
      const volumeSeries = chart.addHistogramSeries({
        color: "#3b82f6",
        priceFormat: { type: "volume" },
        priceScaleId: "",
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(
        data.map((d) => ({
          time: d.time as any,
          value: Math.random() * 1000 + 100,
          color: d.close >= d.open ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
        }))
      );

      chart.timeScale().fitContent();
      
      // Limit zoom so candles don't get too huge when few candles
      try {
        chart.timeScale().applyOptions({
          barSpacing: 8,
          rightOffset: 12,
        });
      } catch (e) {}

      // Save refs for live updates
      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", handleResize);
      handleResize();

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
      };
    };

    const cleanup = loadChart();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, [symbol, selectedTimeframe]);

  // Live price update - updates current candle based on selected timeframe
  useEffect(() => {
    if (!candleSeriesRef.current || !realPrices) return;
    
    const priceInfo = realPrices[symbol];
    if (!priceInfo) return;
    
    const midPrice = (priceInfo.bid + priceInfo.ask) / 2;
    const now = Math.floor(Date.now() / 1000);
    const candleTime = Math.floor(now / timeframeSeconds) * timeframeSeconds;
    const historyKey = `${symbol}-${selectedTimeframe}`;
    
    try {
      const last = lastPriceRef.current;
      let newCandle;
      
      if (last && last.time === candleTime) {
        // Same candle - update OHLC
        newCandle = {
          time: candleTime,
          open: last.openPrice,
          high: Math.max(last.highPrice, midPrice),
          low: Math.min(last.lowPrice, midPrice),
          close: midPrice,
        };
        lastPriceRef.current = {
          ...last,
          price: midPrice,
          highPrice: newCandle.high,
          lowPrice: newCandle.low,
        };
      } else {
        // New candle
        newCandle = {
          time: candleTime,
          open: last ? last.price : midPrice,
          high: midPrice,
          low: midPrice,
          close: midPrice,
        };
        lastPriceRef.current = {
          price: midPrice,
          time: candleTime,
          openPrice: newCandle.open,
          highPrice: newCandle.high,
          lowPrice: newCandle.low,
        };
      }
      
      candleSeriesRef.current.update(newCandle as any);
      
      // Persist to history - keep last 200 candles
      setCandleHistory(prev => {
        const existing = prev[historyKey] || [];
        const filtered = existing.filter(c => c.time < candleTime);
        const updated = [...filtered, newCandle];
        if (updated.length > 200) updated.shift();
        return { ...prev, [historyKey]: updated };
      });
      
      // Keep chart scrolled to right
      chartRef.current?.timeScale()?.scrollToRealTime();
    } catch (e) {
      console.warn('[Chart] Update failed:', e);
    }
  }, [realPrices, symbol, timeframeSeconds]);

  return (
    <div className="bg-dark-200 rounded-lg overflow-hidden">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-white">{symbol}</h3>
          <span className="px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded">
            Synthetic Index
          </span>
        </div>
        <div className="flex gap-1">
          {["M1", "M5", "M15", "M30", "H1"].map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                selectedTimeframe === tf
                  ? "bg-primary-600 text-white"
                  : "bg-dark-100 text-slate-400 hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="h-[400px]" />
    </div>
  );
};

// Signal Card Component
const SignalCard = ({ signal }: { signal: Signal }) => {
  const timeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const statusConfig: Record<SignalStatus, { color: string; text: string; glow: string }> = {
    ACTIVE: { color: "bg-success", text: "Active", glow: "" },
    HIT_TP1: { color: "bg-primary-500", text: "TP1", glow: "signal-glow-buy" },
    HIT_TP2: { color: "bg-primary-600", text: "TP2", glow: "signal-glow-buy" },
    HIT_TP3: { color: "bg-primary-700", text: "TP3", glow: "signal-glow-buy" },
    HIT_SL: { color: "bg-danger", text: "SL", glow: "signal-glow-sell" },
    EXPIRED: { color: "bg-slate-500", text: "Expired", glow: "" },
  };

  const config = statusConfig[signal.status];

  return (
    <div
      className={`bg-dark-200 rounded-lg p-4 border transition-all hover:border-primary-500/50 ${config.glow}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs font-bold rounded ${
              signal.type === "BUY"
                ? "bg-success/20 text-success"
                : "bg-danger/20 text-danger"
            }`}
          >
            {signal.type}
          </span>
          <span className="text-xs text-slate-400">{signal.timeframe}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${config.color} ${signal.status === "ACTIVE" ? "signal-live" : ""}`} />
          <span className="text-xs text-slate-400">{config.text}</span>
        </div>
      </div>

      {/* Symbol & Price */}
      <div className="mb-3">
        <p className="text-lg font-bold text-white">{signal.symbol}</p>
        <p className="text-sm text-slate-400">{timeAgo(signal.timestamp)}</p>
      </div>

      {/* Levels */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Entry</span>
          <span className="font-mono text-white">{signal.entry.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">SL</span>
          <span className="font-mono text-danger">{signal.sl.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">TP1</span>
          <span className="font-mono text-success">{signal.tp1.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">TP2</span>
          <span className="font-mono text-success">{signal.tp2.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">TP3</span>
          <span className="font-mono text-success">{signal.tp3.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
        <span className="text-xs text-slate-500">{signal.indicator}</span>
        <div className="flex items-center gap-1">
          <div className="w-16 h-1.5 bg-dark-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{signal.confidence}%</span>
        </div>
      </div>
    </div>
  );
};

// Scalping Panel
const ScalpingPanel = ({ signals }: { signals: Signal[] }) => {
  const [expanded, setExpanded] = useState(true);
  const scalpingSignals = signals.filter((s) => ["M1", "M5", "M15"].includes(s.timeframe));

  return (
    <div className="bg-dark-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-dark-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-warning" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Scalping Signals</h3>
            <p className="text-xs text-slate-400">
              ZigZag + Stochastic (5,3,3) • M15, M5, M1
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-success/20 text-success text-xs rounded-full">
            {scalpingSignals.filter((s) => s.status === "ACTIVE").length} Active
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0">
          <div className="grid grid-cols-3 gap-4">
            {scalpingSignals.slice(0, 6).map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Intraday Panel
const IntradayPanel = ({ signals }: { signals: Signal[] }) => {
  const [expanded, setExpanded] = useState(true);
  const intradaySignals = signals.filter((s) => ["M30", "H1"].includes(s.timeframe));

  return (
    <div className="bg-dark-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-dark-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Intraday Signals</h3>
            <p className="text-xs text-slate-400">
              CHoCH, BOS, FVG (SMC) • M30, H1
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-success/20 text-success text-xs rounded-full">
            {intradaySignals.filter((s) => s.status === "ACTIVE").length} Active
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-4">
            {intradaySignals.slice(0, 4).map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Telegram Bot Panel
const TelegramPanel = ({ config, onUpdate }: { config: TelegramConfig; onUpdate: (config: TelegramConfig) => void }) => {
  const [botToken, setBotToken] = useState(config.botToken);
  const [chatId, setChatId] = useState(config.chatId);

  const handleSave = () => {
    onUpdate({ ...config, botToken, chatId });
  };

  return (
    <div className="bg-dark-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-lg bg-[#229ED9]/20 flex items-center justify-center">
          <Send className="w-6 h-6 text-[#229ED9]" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Telegram Bot Integration</h3>
          <p className="text-sm text-slate-400">Receive signals directly to your Telegram</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Bot Token</label>
          <input
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="Enter your Telegram bot token"
            className="w-full bg-dark-100 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Chat ID</label>
          <input
            type="text"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="Your Telegram chat ID"
            className="w-full bg-dark-100 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => onUpdate({ ...config, enabled: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${config.enabled ? "bg-success" : "bg-slate-700"}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${config.enabled ? "translate-x-5 ml-0.5" : "translate-x-0.5"}`} />
              </div>
            </div>
            <span className="text-sm text-slate-400">Enable notifications</span>
          </label>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// Settings Panel
const SettingsPanel = ({ mt5Config, onUpdate }: { mt5Config: MT5Config; onUpdate: (config: MT5Config) => void }) => {
  const [server, setServer] = useState(mt5Config.server);

  return (
    <div className="bg-dark-200 rounded-lg p-6">
      <h3 className="font-semibold text-white mb-6">MT5 Settings</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">MT5 Server</label>
          <input
            type="text"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            placeholder="e.g., Weltrade-Server"
            className="w-full bg-dark-100 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="p-4 bg-dark-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${mt5Config.connected ? "bg-success signal-live" : "bg-slate-500"}`} />
              <span className="text-sm text-slate-400">
                {mt5Config.connected ? "Connected to MT5" : "Not connected"}
              </span>
            </div>
            <button
              onClick={() => onUpdate({ ...mt5Config, connected: !mt5Config.connected })}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mt5Config.connected
                  ? "bg-danger/20 text-danger hover:bg-danger/30"
                  : "bg-success/20 text-success hover:bg-success/30"
              }`}
            >
              {mt5Config.connected ? "Disconnect" : "Connect"}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700/50">
          <h4 className="text-sm font-medium text-white mb-3">Notification Settings</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-dark-100 border-slate-700" />
              <span className="text-sm text-slate-400">New signal alerts</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-dark-100 border-slate-700" />
              <span className="text-sm text-slate-400">TP/SL hit notifications</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-dark-100 border-slate-700" />
              <span className="text-sm text-slate-400">Daily summary</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// Signals Table Component
const SignalsTable = ({ 
  signals, 
  onDeleteSignal,
  onDeleteAll,
  onDeleteByStatus,
}: { 
  signals: Signal[]; 
  onDeleteSignal: (id: string) => void;
  onDeleteAll: () => void;
  onDeleteByStatus: (status: SignalStatus) => void;
}) => {
  const [filterSymbol, setFilterSymbol] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterTimeframe, setFilterTimeframe] = useState<string>("ALL");
  const [showPruneMenu, setShowPruneMenu] = useState(false);

  const filteredSignals = signals.filter((s) => {
    if (filterSymbol !== "ALL" && s.symbol !== filterSymbol) return false;
    if (filterType !== "ALL" && s.type !== filterType) return false;
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
    if (filterTimeframe !== "ALL" && s.timeframe !== filterTimeframe) return false;
    return true;
  });

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  const getStatusBadge = (status: SignalStatus) => {
    const config: Record<SignalStatus, { bg: string; text: string }> = {
      ACTIVE: { bg: "bg-success/20 text-success", text: "ACTIVE" },
      HIT_TP1: { bg: "bg-primary-500/20 text-primary-400", text: "TP1" },
      HIT_TP2: { bg: "bg-primary-600/20 text-primary-400", text: "TP2" },
      HIT_TP3: { bg: "bg-primary-700/20 text-primary-400", text: "TP3" },
      HIT_SL: { bg: "bg-danger/20 text-danger", text: "SL" },
      EXPIRED: { bg: "bg-slate-500/20 text-slate-400", text: "EXP" },
    };
    return config[status];
  };

  const uniqueSymbols = [...new Set(signals.map((s) => s.symbol))];
  const uniqueTimeframes = [...new Set(signals.map((s) => s.timeframe))];

  return (
    <div className="bg-dark-200 rounded-lg overflow-hidden">
      {/* Table Header with Filters */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              className="bg-dark-100 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Symbols</option>
              {uniqueSymbols.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-dark-100 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Types</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>

            <select
              value={filterTimeframe}
              onChange={(e) => setFilterTimeframe(e.target.value)}
              className="bg-dark-100 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All TF</option>
              {uniqueTimeframes.map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-dark-100 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="HIT_TP1">TP1</option>
              <option value="HIT_TP2">TP2</option>
              <option value="HIT_TP3">TP3</option>
              <option value="HIT_SL">SL</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{filteredSignals.length} signals</span>
            
            {/* Prune Menu */}
            <div className="relative">
              <button
                onClick={() => setShowPruneMenu(!showPruneMenu)}
                className="px-3 py-2 bg-danger/20 text-danger hover:bg-danger/30 rounded-lg text-sm transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Prune
              </button>
              
              {showPruneMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-dark-100 border border-slate-700 rounded-lg shadow-xl z-20">
                  <div className="p-2">
                    <p className="text-xs text-slate-400 px-2 py-1 mb-1">Delete by result:</p>
                    <button
                      onClick={() => { onDeleteByStatus("HIT_TP1"); setShowPruneMenu(false); }}
                      className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-dark-200 rounded"
                    >
                      Delete TP1 hits
                    </button>
                    <button
                      onClick={() => { onDeleteByStatus("HIT_TP2"); setShowPruneMenu(false); }}
                      className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-dark-200 rounded"
                    >
                      Delete TP2 hits
                    </button>
                    <button
                      onClick={() => { onDeleteByStatus("HIT_TP3"); setShowPruneMenu(false); }}
                      className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-dark-200 rounded"
                    >
                      Delete TP3 hits
                    </button>
                    <button
                      onClick={() => { onDeleteByStatus("HIT_SL"); setShowPruneMenu(false); }}
                      className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-dark-200 rounded"
                    >
                      Delete SL hits
                    </button>
                    <button
                      onClick={() => { onDeleteByStatus("EXPIRED"); setShowPruneMenu(false); }}
                      className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-dark-200 rounded"
                    >
                      Delete Expired
                    </button>
                    <div className="border-t border-slate-700 mt-2 pt-2">
                      <button
                        onClick={() => { onDeleteAll(); setShowPruneMenu(false); }}
                        className="w-full text-left px-2 py-1.5 text-sm text-danger hover:bg-dark-200 rounded"
                      >
                        Delete All
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50 text-xs text-slate-400">
              <th className="text-left px-4 py-3 font-medium">Symbol</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">TF</th>
              <th className="text-right px-4 py-3 font-medium">Entry</th>
              <th className="text-right px-4 py-3 font-medium">SL</th>
              <th className="text-right px-4 py-3 font-medium">TP1</th>
              <th className="text-right px-4 py-3 font-medium">TP2</th>
              <th className="text-right px-4 py-3 font-medium">TP3</th>
              <th className="text-center px-4 py-3 font-medium">Conf%</th>
              <th className="text-center px-4 py-3 font-medium">Result</th>
              <th className="text-center px-4 py-3 font-medium">Time</th>
              <th className="text-center px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSignals.map((signal) => {
              const badge = getStatusBadge(signal.status);
              return (
                <tr key={signal.id} className="border-b border-slate-700/30 hover:bg-dark-100/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{signal.symbol}</p>
                      <p className="text-xs text-slate-500">{signal.indicator.split("(")[0]}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      signal.type === "BUY" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                    }`}>
                      {signal.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{signal.timeframe}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">{signal.entry.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-danger">{signal.sl.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-success">{signal.tp1.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-success">{signal.tp2.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-success">{signal.tp3.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-12 h-1.5 bg-dark-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${signal.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{signal.confidence}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${badge.bg}`}>
                      {badge.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-400">{timeAgo(signal.timestamp)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onDeleteSignal(signal.id)}
                      className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded transition-colors"
                      title="Delete signal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredSignals.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            No signals match your filters
          </div>
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSymbol, setSelectedSymbol] = useState("FXVOL99");
  const [signals, setSignals] = useState<Signal[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    botToken: "",
    chatId: "",
    enabled: false,
  });
  const [mt5Config, setMt5Config] = useState<MT5Config>({
    server: "Weltrade-Server",
    connected: true,
  });
  
  // Extension connection state
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [realPrices, setRealPrices] = useState<Record<string, { bid: number; ask: number }>>({});

  // Poll for real prices from extension
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/prices');
        if (response.ok) {
          const data = await response.json();
          
          console.log('[Dashboard] Prices API:', { isLive: data.isLive, count: data.prices?.length, age: data.age });
          
          // Use isLive flag from server (heartbeat within 10s)
          if (data.isLive) {
            setExtensionConnected(true);
            if (data.prices && data.prices.length > 0) {
              const pricesMap: Record<string, { bid: number; ask: number }> = {};
              data.prices.forEach((p: any) => {
                pricesMap[p.symbol] = { bid: p.bid, ask: p.ask };
              });
              setRealPrices(pricesMap);
            }
          } else {
            setExtensionConnected(false);
          }
        }
      } catch (e) {
        setExtensionConnected(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 2000);
    return () => clearInterval(interval);
  }, []);

  // Initialize signals
  useEffect(() => {
    setSignals(generateSignals());

    // Refresh signals every 30 seconds
    const interval = setInterval(() => {
      setSignals(generateSignals());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const activeSignalsCount = signals.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="flex h-screen bg-dark-400">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={activeSignalsCount}
        extensionConnected={extensionConnected}
        pricesCount={Object.keys(realPrices).length}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-dark-300/95 backdrop-blur border-b border-slate-700/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white capitalize">{activeTab}</h2>
              <span className="text-sm text-slate-400">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              {extensionConnected && (
                <span className="px-2 py-1 bg-success/20 text-success text-xs rounded flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-success signal-live"></div>
                  Live Data
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Symbol Selector */}
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-dark-100 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
              >
                {SYMBOLS.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} - {s.name}
                  </option>
                ))}
              </select>

              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled ? "bg-primary-600 text-white" : "bg-dark-100 text-slate-400"
                }`}
                title={soundEnabled ? "Mute notifications" : "Unmute notifications"}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              {/* Refresh */}
              <button
                onClick={() => setSignals(generateSignals())}
                className="p-2 bg-dark-100 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Refresh signals"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          <PriceTicker realPrices={realPrices} />
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-dark-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-success" />
                    </div>
                    <span className="text-sm text-slate-400">Active Signals</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{activeSignalsCount}</p>
                </div>

                <div className="bg-dark-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary-400" />
                    </div>
                    <span className="text-sm text-slate-400">TP Hit</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {signals.filter((s) => s.status.startsWith("HIT_TP")).length}
                  </p>
                </div>

                <div className="bg-dark-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
                      <X className="w-5 h-5 text-danger" />
                    </div>
                    <span className="text-sm text-slate-400">SL Hit Today</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {signals.filter((s) => s.status === "HIT_SL").length}
                  </p>
                </div>

                <div className="bg-dark-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-warning" />
                    </div>
                    <span className="text-sm text-slate-400">Win Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {signals.filter((s) => ["HIT_TP1", "HIT_TP2", "HIT_TP3"].includes(s.status)).length +
                      signals.filter((s) => s.status === "HIT_SL").length >
                    0
                      ? Math.round(
                          (signals.filter((s) => ["HIT_TP1", "HIT_TP2", "HIT_TP3"].includes(s.status)).length /
                            (signals.filter((s) => ["HIT_TP1", "HIT_TP2", "HIT_TP3"].includes(s.status)).length +
                              signals.filter((s) => s.status === "HIT_SL").length)) *
                            100
                        )
                      : 0}
                    %
                  </p>
                </div>
              </div>

              {/* Chart */}
              <ChartPanel symbol={selectedSymbol} realPrices={realPrices} />

              {/* Signal Panels */}
              <ScalpingPanel signals={signals} />
              <IntradayPanel signals={signals} />
            </div>
          )}

          {activeTab === "signals" && (
            <div className="space-y-6">
              <SignalsTable 
                signals={signals} 
                onDeleteSignal={(id) => setSignals(signals.filter((s) => s.id !== id))}
                onDeleteAll={() => setSignals([])}
                onDeleteByStatus={(status) => setSignals(signals.filter((s) => s.status !== status))}
              />
            </div>
          )}

          {activeTab === "telegram" && (
            <div className="max-w-2xl">
              <TelegramPanel config={telegramConfig} onUpdate={setTelegramConfig} />

              <div className="mt-6 bg-dark-200 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-4">Setup Instructions</h4>
                <ol className="space-y-3 text-sm text-slate-400">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs">
                      1
                    </span>
                    Create a bot via @BotFather on Telegram and copy the bot token
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs">
                      2
                    </span>
                    Start a chat with @userinfobot to get your Chat ID
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs">
                      3
                    </span>
                    Paste the bot token and chat ID above, then enable notifications
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-2xl space-y-6">
              <SettingsPanel mt5Config={mt5Config} onUpdate={setMt5Config} />

              <div className="bg-dark-200 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-4">MT5 Connection Setup</h4>
                <div className="bg-dark-100 rounded-lg p-4 font-mono text-sm text-slate-400">
                  <p className="mb-2"># Install MetaTrader 5 Python package</p>
                  <p className="text-primary-400">pip install MetaTrader5</p>
                  <p className="mt-4 mb-2"># Initialize connection</p>
                  <p className="text-primary-400">import mt5</p>
                  <p className="text-primary-400">mt5.initialize()</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
