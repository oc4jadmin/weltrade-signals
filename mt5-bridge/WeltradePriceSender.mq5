//+------------------------------------------------------------------+
//|                                          WeltradePriceSender.mq5 |
//|                        Sends FX Vol prices to Vercel Dashboard   |
//+------------------------------------------------------------------+
#property copyright "Weltrade Signals"
#property link      "https://weltrade-signals.vercel.app"
#property version   "2.00"
#property strict

input string DashboardUrl = "https://weltrade-signals.vercel.app/api/prices";
input int    UpdateIntervalMs = 2000;

//+------------------------------------------------------------------+
int OnInit()
{
   EventSetMillisecondTimer(UpdateIntervalMs);
   Print("WeltradePriceSender: Initialized");
   Print("WeltradePriceSender: Target URL: ", DashboardUrl);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("WeltradePriceSender: Stopped");
}

//+------------------------------------------------------------------+
void OnTimer()
{
   MqlTick tick99, tick80;
   bool ok99 = SymbolInfoTick("FX Vol 99", tick99);
   bool ok80 = SymbolInfoTick("FX Vol 80", tick80);
   
   Print("FX Vol 99 tick: ok=", ok99, " bid=", tick99.bid, " ask=", tick99.ask);
   Print("FX Vol 80 tick: ok=", ok80, " bid=", tick80.bid, " ask=", tick80.ask);
   
   if(!ok99 && !ok80)
   {
      Print("WeltradePriceSender: No ticks available");
      return;
   }
   
   if(!ok80)
   {
      Print("WeltradePriceSender: FX Vol 80 not found - skipping");
   }
   
   string json = "{";
   json += "\"prices\":[";
   
   bool first = true;
   if(ok99)
   {
      if(!first) json += ",";
      json += "{\"symbol\":\"FXVOL99\",\"bid\":" + DoubleToString(tick99.bid, 5) + ",\"ask\":" + DoubleToString(tick99.ask, 5) + "}";
      first = false;
   }
   if(ok80)
   {
      if(!first) json += ",";
      json += "{\"symbol\":\"FXVOL80\",\"bid\":" + DoubleToString(tick80.bid, 5) + ",\"ask\":" + DoubleToString(tick80.ask, 5) + "}";
      first = false;
   }
   
   json += "],\"source\":\"mt5-ea\"}";
   
   Print("WeltradePriceSender: Sending: ", json);
   
   char data[], result[];
   string headers;
   int jsonSize = StringToCharArray(json, data);
   
   // Remove trailing null terminator
   if(jsonSize > 0)
   {
      ArrayResize(data, jsonSize - 1);
   }
   
   int res = WebRequest("POST", DashboardUrl, headers, 5000, data, result, headers);
   
   Print("WeltradePriceSender: Response code: ", res);
   Print("WeltradePriceSender: Response: ", CharArrayToString(result));
}
//+------------------------------------------------------------------+
