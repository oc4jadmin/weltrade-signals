//+------------------------------------------------------------------+
//|                                          WeltradePriceSender.mq5 |
//|                        Sends FX Vol prices to Vercel Dashboard   |
//+------------------------------------------------------------------+
#property copyright "Weltrade Signals"
#property link      "https://weltrade-signals.vercel.app"
#property version   "1.00"
#property strict

// Dashboard URL
input string DashboardUrl = "https://weltrade-signals.vercel.app/api/prices";
input int    UpdateIntervalMs = 2000;  // Send interval in ms

// Symbol mapping: MT5 symbol -> Dashboard symbol code
string MT5Symbols[] = {
   "FX Vol 99",
   "FX Vol 80",
   "FX Vol 60",
   "FX Vol 40",
   "FX Vol 20"
};

string DashboardSymbols[] = {
   "FXVOL99",
   "FXVOL80",
   "FXVOL60",
   "FXVOL40",
   "FXVOL20"
};

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   EventSetMillisecondTimer(UpdateIntervalMs);
   Print("WeltradePriceSender: Initialized");
   Print("WeltradePriceSender: Sending to ", DashboardUrl);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("WeltradePriceSender: Stopped");
}

//+------------------------------------------------------------------+
//| Timer function                                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   string jsonBody = BuildJsonPayload();
   
   string url = DashboardUrl;
   string headers;
   uchar data[];
   uchar result[];
   int res;
   
   StringToCharArray(jsonBody, data);
   
   res = WebRequest(
      "POST",
      url,
      headers,
      5000,
      data,
      result,
      headers
   );
   
   if(res != 200)
   {
      Print("WeltradePriceSender: WebRequest failed, error: ", res);
      return;
   }
   
   Print("WeltradePriceSender: Sent prices successfully");
}

//+------------------------------------------------------------------+
//| Build JSON payload                                               |
//+------------------------------------------------------------------+
string BuildJsonPayload()
{
   string pricesArray = "";
   int count = 0;
   
   for(int i = 0; i < ArraySize(MT5Symbols); i++)
   {
      string mt5Symbol = MT5Symbols[i];
      string dashSymbol = DashboardSymbols[i];
      
      if(!SymbolSelect(mt5Symbol, true))
      {
         Print("WeltradePriceSender: Cannot select symbol ", mt5Symbol);
         continue;
      }
      
      MqlTick tick;
      if(!SymbolInfoTick(mt5Symbol, tick))
      {
         Print("WeltradePriceSender: Cannot get tick for ", mt5Symbol);
         continue;
      }
      
      if(count > 0) pricesArray += ",";
      
      pricesArray += "{";
      pricesArray += "\"symbol\":\"" + dashSymbol + "\",";
      pricesArray += "\"bid\":" + DoubleToString(tick.bid, 5) + ",";
      pricesArray += "\"ask\":" + DoubleToString(tick.ask, 5) + ",";
      pricesArray += "\"timestamp\":" + IntegerToString((int)TimeLocal());
      pricesArray += "}";
      
      count++;
   }
   
   string payload = "{";
   payload += "\"prices\":[" + pricesArray + "],";
   payload += "\"source\":\"mt5-ea\",";
   payload += "\"timestamp\":" + IntegerToString((int)TimeLocal());
   payload += "}";
   
   return payload;
}
//+------------------------------------------------------------------+
