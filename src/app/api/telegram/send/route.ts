import { NextRequest, NextResponse } from "next/server";

interface SignalData {
  symbol: string;
  type: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp: number;
  timeframe: string;
  indicator: string;
}

export async function POST(request: NextRequest) {
  try {
    const { botToken, chatId, signal } = await request.json();

    if (!botToken || !chatId || !signal) {
      return NextResponse.json(
        { error: "Missing required fields: botToken, chatId, and signal are required" },
        { status: 400 }
      );
    }

    const signalData = signal as SignalData;

    // Format message
    const emoji = signalData.type === "BUY" ? "🟢" : "🔴";
    const message = `
${emoji} *NEW SIGNAL - ${signalData.symbol}*

📊 Type: *${signalData.type}*
⏱️ Timeframe: *${signalData.timeframe}*
🔧 Indicator: *${signalData.indicator}*

💰 Entry: *${signalData.entry.toFixed(2)}*
🛑 Stop Loss: *${signalData.sl.toFixed(2)}*
🎯 Take Profit: *${signalData.tp.toFixed(2)}*

📈 Risk/Reward: ${((signalData.tp - signalData.entry) / (signalData.entry - signalData.sl)).toFixed(2)}:1

_Powered by Weltrade Signals_
    `.trim();

    // Send to Telegram
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await telegramResponse.json();

    if (!result.ok) {
      return NextResponse.json(
        { error: `Telegram API error: ${result.description}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, messageId: result.result.message_id });
  } catch (error) {
    console.error("Telegram send error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
