import { NextRequest, NextResponse } from "next/server";

// Telegram webhook handler for receiving updates
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Handle /start command
    if (update.message?.text === "/start") {
      const chatId = update.message.chat.id;
      
      // You would normally save this chatId to your database
      console.log(`New subscriber: ${chatId}`);

      return NextResponse.json({
        method: "sendMessage",
        chat_id: chatId,
        text: "🎉 Welcome to Weltrade Signals Bot!\n\nYou'll receive trading signals for Synthetic Indices here.\n\nCommands:\n/start - Show this message\n/signals - Get latest signals\n/settings - Configure notifications",
      });
    }

    // Handle /signals command
    if (update.message?.text === "/signals") {
      const chatId = update.message.chat.id;

      // Return latest signals
      return NextResponse.json({
        method: "sendMessage",
        chat_id: chatId,
        text: "📊 Fetching latest signals...\n\n(This would fetch real signals from your database)",
      });
    }

    // Handle /settings command
    if (update.message?.text === "/settings") {
      const chatId = update.message.chat.id;

      return NextResponse.json({
        method: "sendMessage",
        chat_id: chatId,
        text: "⚙️ Settings\n\nConfigure your notification preferences through the dashboard.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
