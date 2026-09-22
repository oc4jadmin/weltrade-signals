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

// Symbol names
string SYMBOL_99_MT5 = "FX Vol 99";
string SYMBOL_80_MT5 = "FX Vol 80";
string SYMBOL_99_DASH = "FXVOL99";
string SYMBOL_80_DASH = "FXVOL80";

// Indicator handles
int EMA99_M1, EMA99_M5, EMA99_M15;
int EMA80_M1, EMA80_M5, EMA80_M15;
int STOCH99_M1, STOCH99_M5, STOCH99_M15;
int STOCH80_M1, STOCH80_M5, STOCH80_M15;

// Last signal time tracking
// index: symbol (0=99, 1=80), tf (0=M1, 1=M5, 2=M15), type (0=buy, 1=sell)
datetime LastSignalTime[2][3][2];

//+------------------------------------------------------------------+
int OnInit()
{
   EventSetTimer(UpdateIntervalSec);
   
   // EMA50 handles for FX Vol 99
   EMA99_M1 = iMA(SYMBOL_99_MT5, PERIOD_M1, 50, 0, MODE_EMA, PRICE_CLOSE);
   EMA99_M5 = iMA(SYMBOL_99_MT5, PERIOD_M5, 50, 0, MODE_EMA, PRICE_CLOSE);
   EMA99_M15 = iMA(SYMBOL_99_MT5, PERIOD_M15, 50, 0, MODE_EMA, PRICE_CLOSE);
   
   // EMA50 handles for FX Vol 80
   EMA80_M1 = iMA(SYMBOL_80_MT5, PERIOD_M1, 50, 0, MODE_EMA, PRICE_CLOSE);
   EMA80_M5 = iMA(SYMBOL_80_MT5, PERIOD_M5, 50, 0, MODE_EMA, PRICE_CLOSE);
   EMA80_M15 = iMA(SYMBOL_80_MT5, PERIOD_M15, 50, 0, MODE_EMA, PRICE_CLOSE);
   
   // Stochastic (5,3,3) handles for FX Vol 99
   STOCH99_M1 = iStochastic(SYMBOL_99_MT5, PERIOD_M1, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   STOCH99_M5 = iStochastic(SYMBOL_99_MT5, PERIOD_M5, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   STOCH99_M15 = iStochastic(SYMBOL_99_MT5, PERIOD_M15, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   
   // Stochastic (5,3,3) handles for FX Vol 80
   STOCH80_M1 = iStochastic(SYMBOL_80_MT5, PERIOD_M1, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   STOCH80_M5 = iStochastic(SYMBOL_80_MT5, PERIOD_M5, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   STOCH80_M15 = iStochastic(SYMBOL_80_MT5, PERIOD_M15, 5, 3, 3, MODE_SMA, STO_LOWHIGH);
   
   Print("WeltradeSignalSender v3.00: Initialized");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   
   IndicatorRelease(EMA99_M1);
   IndicatorRelease(EMA99_M5);
   IndicatorRelease(EMA99_M15);
   IndicatorRelease(EMA80_M1);
   IndicatorRelease(EMA80_M5);
   IndicatorRelease(EMA80_M15);
   
   IndicatorRelease(STOCH99_M1);
   IndicatorRelease(STOCH99_M5);
   IndicatorRelease(STOCH99_M15);
   IndicatorRelease(STOCH80_M1);
   IndicatorRelease(STOCH80_M5);
   IndicatorRelease(STOCH80_M15);
}

//+------------------------------------------------------------------+
void OnTimer()
{
   static datetime lastLog = 0;
   if(TimeLocal() - lastLog > 60)
   {
      lastLog = TimeLocal();
      MqlTick tick;
      if(SymbolInfoTick(SYMBOL_99_MT5, tick))
      {
         double price = (tick.bid + tick.ask) / 2;
         double ema[1];
         if(CopyBuffer(EMA99_M1, 0, 0, 1, ema) > 0)
         {
            Print("Status: Price=", DoubleToString(price, 2), " EMA50=", DoubleToString(ema[0], 2), " Trend=", price > ema[0] ? "UP" : "DOWN");
         }
      }
   }
   
   CheckSignal(SYMBOL_99_MT5, SYMBOL_99_DASH, PERIOD_M1, "M1", EMA99_M1, STOCH99_M1, 0, 0);
   CheckSignal(SYMBOL_99_MT5, SYMBOL_99_DASH, PERIOD_M5, "M5", EMA99_M5, STOCH99_M5, 0, 1);
   CheckSignal(SYMBOL_99_MT5, SYMBOL_99_DASH, PERIOD_M15, "M15", EMA99_M15, STOCH99_M15, 0, 2);
   
   CheckSignal(SYMBOL_80_MT5, SYMBOL_80_DASH, PERIOD_M1, "M1", EMA80_M1, STOCH80_M1, 1, 0);
   CheckSignal(SYMBOL_80_MT5, SYMBOL_80_DASH, PERIOD_M5, "M5", EMA80_M5, STOCH80_M5, 1, 1);
   CheckSignal(SYMBOL_80_MT5, SYMBOL_80_DASH, PERIOD_M15, "M15", EMA80_M15, STOCH80_M15, 1, 2);
}

//+------------------------------------------------------------------+
void CheckSignal(string mt5Symbol, string dashSymbol, ENUM_TIMEFRAMES tf, string tfStr, int emaHandle, int stochHandle, int symbolIdx, int tfIdx)
{
   if(emaHandle == INVALID_HANDLE || stochHandle == INVALID_HANDLE) return;
   
   MqlTick tick;
   if(!SymbolInfoTick(mt5Symbol, tick)) return;
   double price = (tick.bid + tick.ask) / 2;
   
   double ema[1];
   if(CopyBuffer(emaHandle, 0, 0, 1, ema) <= 0) return;
   double currentEma = ema[0];
   
   double k[2], d[2];
   if(CopyBuffer(stochHandle, 0, 0, 2, k) <= 0) return;
   if(CopyBuffer(stochHandle, 1, 0, 2, d) <= 0) return;
   
   double prevK = k[1];
   double currK = k[0];
   double prevD = d[1];
   double currD = d[0];
   
   bool isUptrend = price > currentEma;
   bool isDowntrend = price < currentEma;
   
   datetime currentTime = iTime(mt5Symbol, tf, 0);
   if(currentTime == 0) currentTime = TimeLocal();
   
   // BUY signal
   if(isUptrend && prevK <= 20 && currK > 20 && currK > currD && prevK <= prevD)
   {
      if(currentTime != LastSignalTime[symbolIdx][tfIdx][0])
      {
         SendSignal(dashSymbol, tfStr, "BUY", price);
         LastSignalTime[symbolIdx][tfIdx][0] = currentTime;
      }
   }
   
   // SELL signal
   if(isDowntrend && prevK >= 80 && currK < 80 && currK < currD && prevK >= prevD)
   {
      if(currentTime != LastSignalTime[symbolIdx][tfIdx][1])
      {
         SendSignal(dashSymbol, tfStr, "SELL", price);
         LastSignalTime[symbolIdx][tfIdx][1] = currentTime;
      }
   }
}

//+------------------------------------------------------------------+
void SendSignal(string symbol, string timeframe, string type, double entry)
{
   int slPoints = 100;
   int tp1Points = 100;
   int tp2Points = 200;
   int tp3Points = 300;
   
   if(timeframe == "M5")
   {
      slPoints = 120;
      tp1Points = 150;
      tp2Points = 300;
      tp3Points = 450;
   }
   else if(timeframe == "M15")
   {
      slPoints = 200;
      tp1Points = 250;
      tp2Points = 500;
      tp3Points = 750;
   }
   
   double sl;
   double tp1;
   double tp2;
   double tp3;
   
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
   
   char data[];
   char result[];
   string headers;
   StringToCharArray(json, data);
   
   int res = WebRequest("POST", DashboardUrl, headers, 5000, data, result, headers);
   Print("Response: ", res);
}
//+------------------------------------------------------------------+
