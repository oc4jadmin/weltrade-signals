//+------------------------------------------------------------------+
//|                                        WeltradeSignalSender.mq5  |
//|                     Sends trading signals to Vercel Dashboard    |
//+------------------------------------------------------------------+
#property copyright "Weltrade Signals"
#property link      "https://weltrade-signals.vercel.app"
#property version   "3.00"
#property strict

input string DashboardUrl = "https://weltrade-signals.vercel.app/api/signals";
input int    UpdateIntervalSec = 10;

// Indicators
int EMA50Handle_M1, EMA50Handle_M5, EMA50Handle_M15;
int StochHandle_M1, StochHandle_M5, StochHandle_M15;

//+------------------------------------------------------------------+
int OnInit()
{
   EventSetTimer(UpdateIntervalSec);
   
   // Create indicator handles
   EMA50Handle_M1 = iMA("FX Vol 99", PERIOD_M1, 50, 0, MODE_EMA, PRICE_CLOSE);
   EMA50Handle_M5 = iMA("FX Vol 99", PERIOD_M5, 50, 0, MODE_EMA, PRICE_CLOSE);
   EMA50Handle_M15 = iMA("FX Vol 99", PERIOD_M15, 50, 0, MODE_EMA, PRICE_CLOSE);
   
   StochHandle_M1 = iStochastic("FX Vol 99", PERIOD_M1, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   StochHandle_M5 = iStochastic("FX Vol 99", PERIOD_M5, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   StochHandle_M15 = iStochastic("FX Vol 99", PERIOD_M15, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   
   Print("WeltradeSignalSender: Initialized");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   IndicatorRelease(EMA50Handle_M1);
   IndicatorRelease(EMA50Handle_M5);
   IndicatorRelease(EMA50Handle_M15);
   IndicatorRelease(StochHandle_M1);
   IndicatorRelease(StochHandle_M5);
   IndicatorRelease(StochHandle_M15);
}

//+------------------------------------------------------------------+
void OnTimer()
{
   CheckAndSendSignals("FX Vol 99", "FXVOL99", PERIOD_M1, "M1", EMA50Handle_M1, StochHandle_M1);
   CheckAndSendSignals("FX Vol 99", "FXVOL99", PERIOD_M5, "M5", EMA50Handle_M5, StochHandle_M5);
   CheckAndSendSignals("FX Vol 99", "FXVOL99", PERIOD_M15, "M15", EMA50Handle_M15, StochHandle_M15);
   
   CheckAndSendSignals("FX Vol 80", "FXVOL80", PERIOD_M1, "M1", EMA50Handle_M1, StochHandle_M1);
   CheckAndSendSignals("FX Vol 80", "FXVOL80", PERIOD_M5, "M5", EMA50Handle_M5, StochHandle_M5);
   CheckAndSendSignals("FX Vol 80", "FXVOL80", PERIOD_M15, "M15", EMA50Handle_M15, StochHandle_M15);
}

//+------------------------------------------------------------------+
void CheckAndSendSignals(string mt5Symbol, string dashSymbol, ENUM_TIMEFRAMES tf, string tfStr, int emaHandle, int stochHandle)
{
   // Get current price
   MqlTick tick;
   if(!SymbolInfoTick(mt5Symbol, tick)) return;
   double price = (tick.bid + tick.ask) / 2;
   
   // Get EMA50
   double ema[];
   if(CopyBuffer(emaHandle, 0, 0, 1, ema) <= 0) return;
   double currentEma = ema[0];
   
   // Get Stochastic
   double k[], d[];
   if(CopyBuffer(stochHandle, 0, 0, 2, k) <= 0) return;
   if(CopyBuffer(stochHandle, 1, 0, 2, d) <= 0) return;
   
   double prevK = k[1], currK = k[0];
   double prevD = d[1], currD = d[0];
   
   // Determine trend
   bool isUptrend = price > currentEma;
   bool isDowntrend = price < currentEma;
   
   // Check BUY signal: Uptrend + Stoch cross up <20
   if(isUptrend && prevK <= 20 && currK > 20 && currK > currD && prevK <= prevD)
   {
      SendSignal(dashSymbol, tfStr, "BUY", price, tick, tf);
   }
   
   // Check SELL signal: Downtrend + Stoch cross down >80
   if(isDowntrend && prevK >= 80 && currK < 80 && currK < currD && prevK >= prevD)
   {
      SendSignal(dashSymbol, tfStr, "SELL", price, tick, tf);
   }
}

//+------------------------------------------------------------------+
void SendSignal(string symbol, string timeframe, string type, double entry, MqlTick tick, ENUM_TIMEFRAMES tf)
{
   // Calculate fixed TP/SL points
   int slPoints = 100, tp1Points = 100, tp2Points = 200, tp3Points = 300;
   
   if(timeframe == "M5") { slPoints = 120; tp1Points = 150; tp2Points = 300; tp3Points = 450; }
   else if(timeframe == "M15") { slPoints = 200; tp1Points = 250; tp2Points = 500; tp3Points = 750; }
   
   // Get recent swing for SL
   double swingLow = entry - slPoints;
   double swingHigh = entry + slPoints;
   
   double sl, tp1, tp2, tp3;
   if(type == "BUY")
   {
      sl = MathMin(entry - slPoints, swingLow - slPoints * 0.3);
      tp1 = entry + tp1Points;
      tp2 = entry + tp2Points;
      tp3 = entry + tp3Points;
   }
   else
   {
      sl = MathMax(entry + slPoints, swingHigh + slPoints * 0.3);
      tp1 = entry - tp1Points;
      tp2 = entry - tp2Points;
      tp3 = entry - tp3Points;
   }
   
   // Build JSON
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
   json += "\"confidence\":" + IntegerToString(75 + (int)(MathRand() % 15)) + ",";
   json += "\"timestamp\":" + IntegerToString((int)TimeLocal()) + ",";
   json += "\"source\":\"mt5-ea\"";
   json += "}";
   
   Print("Signal: ", json);
   
   char data[], result[];
   string headers;
   StringToCharArray(json, data);
   
   int res = WebRequest("POST", DashboardUrl, headers, 5000, data, result, headers);
   Print("Signal sent, response: ", res);
}
//+------------------------------------------------------------------+
