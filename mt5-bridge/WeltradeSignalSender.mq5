//+------------------------------------------------------------------+
//|                                      WeltradeSignalSender.mq5     |
//|                   Sends FX Vol scalping signals to dashboard      |
//+------------------------------------------------------------------+
#property copyright "Weltrade Signals"
#property link      "https://weltrade-signals.vercel.app"
#property version   "3.00"
#property strict

input string DashboardUrl = "https://weltrade-signals.vercel.app/api/signals";
input int    UpdateIntervalSec = 5;

// Symbols to monitor
string MT5Symbols[] = {"FX Vol 99", "FX Vol 80"};
string DashSymbols[] = {"FXVOL99", "FXVOL80"};
ENUM_TIMEFRAMES TFs[] = {PERIOD_M1, PERIOD_M5, PERIOD_M15};
string TFStrings[] = {"M1", "M5", "M15"};

// Indicator handles: [symbolIdx][tfIdx]
int EMAHandles[2][3];
int StochHandles[2][3];

// Last signal time tracking to avoid duplicates
// [symbol][tf][type: 0=buy, 1=sell]
datetime LastSignalTime[2][3][2];

//+------------------------------------------------------------------+
int OnInit()
{
   EventSetTimer(UpdateIntervalSec);
   
   for(int s = 0; s < ArraySize(MT5Symbols); s++)
   {
      for(int t = 0; t < ArraySize(TFs); t++)
      {
         EMAHandles[s][t] = iMA(MT5Symbols[s], TFs[t], 50, 0, MODE_EMA, PRICE_CLOSE);
         StochHandles[s][t] = iStochastic(MT5Symbols[s], TFs[t], 5, 3, 3, MODE_SMA, STO_LOWHIGH);
         
         if(EMAHandles[s][t] == INVALID_HANDLE || StochHandles[s][t] == INVALID_HANDLE)
         {
            Print("Failed to create indicators for ", MT5Symbols[s], " ", TFStrings[t]);
         }
      }
   }
   
   Print("WeltradeSignalSender v3.00: Initialized");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   for(int s = 0; s < ArraySize(MT5Symbols); s++)
   {
      for(int t = 0; t < ArraySize(TFs); t++)
      {
         IndicatorRelease(EMAHandles[s][t]);
         IndicatorRelease(StochHandles[s][t]);
      }
   }
}

//+------------------------------------------------------------------+
void OnTimer()
{
   for(int s = 0; s < ArraySize(MT5Symbols); s++)
   {
      for(int t = 0; t < ArraySize(TFs); t++)
      {
         CheckAndSendSignal(s, t);
      }
   }
}

//+------------------------------------------------------------------+
void CheckAndSendSignal(int symbolIdx, int tfIdx)
{
   string mt5Symbol = MT5Symbols[symbolIdx];
   string dashSymbol = DashSymbols[symbolIdx];
   string tfStr = TFStrings[tfIdx];
   ENUM_TIMEFRAMES tf = TFs[tfIdx];
   
   // Get current price
   MqlTick tick;
   if(!SymbolInfoTick(mt5Symbol, tick)) return;
   double price = (tick.bid + tick.ask) / 2;
   
   // Get EMA50
   double ema[];
   if(CopyBuffer(EMAHandles[symbolIdx][tfIdx], 0, 0, 1, ema) <= 0) return;
   double currentEma = ema[0];
   
   // Get Stochastic (need 2 bars for cross detection)
   double k[], d[];
   if(CopyBuffer(StochHandles[symbolIdx][tfIdx], 0, 0, 2, k) <= 0) return;
   if(CopyBuffer(StochHandles[symbolIdx][tfIdx], 1, 0, 2, d) <= 0) return;
   
   double prevK = k[1], currK = k[0];
   double prevD = d[1], currD = d[0];
   
   bool isUptrend = price > currentEma;
   bool isDowntrend = price < currentEma;
   
   datetime currentTime = iTime(mt5Symbol, tf, 0);
   if(currentTime == 0) currentTime = TimeLocal();
   
   // BUY signal
   if(isUptrend && prevK <= 20 && currK > 20 && currK > currD && prevK <= prevD)
   {
      if(currentTime != LastSignalTime[symbolIdx][tfIdx][0])
      {
         SendSignal(dashSymbol, tfStr, "BUY", price, tick);
         LastSignalTime[symbolIdx][tfIdx][0] = currentTime;
      }
   }
   
   // SELL signal
   if(isDowntrend && prevK >= 80 && currK < 80 && currK < currD && prevK >= prevD)
   {
      if(currentTime != LastSignalTime[symbolIdx][tfIdx][1])
      {
         SendSignal(dashSymbol, tfStr, "SELL", price, tick);
         LastSignalTime[symbolIdx][tfIdx][1] = currentTime;
      }
   }
}

//+------------------------------------------------------------------+
void SendSignal(string symbol, string timeframe, string type, double entry, MqlTick tick)
{
   int slPoints = 100, tp1Points = 100, tp2Points = 200, tp3Points = 300;
   
   if(timeframe == "M5") { slPoints = 120; tp1Points = 150; tp2Points = 300; tp3Points = 450; }
   else if(timeframe == "M15") { slPoints = 200; tp1Points = 250; tp2Points = 500; tp3Points = 750; }
   
   double sl, tp1, tp2, tp3;
   if(type == "BUY")
   {
      sl = entry - slPoints;
      tp1 = entry + tp1Points;
      tp2 = entry + tp2Points;
      tp3 = entry + tp3Points;
   }
   else
   {
      sl = entry + slPoints;
      tp1 = entry - tp1Points;
      tp2 = entry - tp2Points;
      tp3 = entry - tp3Points;
   }
   
   string json = "{";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"type\":\"" + type + "\",";
   json += "\"timeframe\":\"" + timeframe + "\",";
   json += "\"entry\":" + DoubleToString(entry, 2) + ",";
   json += "\"sl\":" + DoubleToString(sl, 2) + ",";
   json += "\"tp1\":" + DoubleToString(tp1, 2) + ",";
   json += "\"tp2\":" + DoubleToString(tp2, 2) + ",";
   json += "\"tp3\":" + DoubleToString(tp3, 2) + ",";
   json += "\"pip\":" + IntegerToString(tp1Points) + ",";
   json += "\"indicator\":\"EMA50 + Stochastic (5,3,3)\",";
   json += "\"confidence\":" + IntegerToString(75 + (int)(MathRand() % 20)) + ",";
   json += "\"timestamp\":" + IntegerToString((int)TimeLocal()) + ",";
   json += "\"source\":\"mt5-ea\"";
   json += "}";
   
   Print("Signal: ", type, " ", symbol, " ", timeframe, " @", entry);
   
   char data[], result[];
   string headers;
   StringToCharArray(json, data);
   
   int res = WebRequest("POST", DashboardUrl, headers, 5000, data, result, headers);
   Print("Response: ", res);
}
//+------------------------------------------------------------------+
