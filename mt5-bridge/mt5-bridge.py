import asyncio
import json
import websockets
import MetaTrader5 as mt5

# Initialize MT5 Connection
if not mt5.initialize():
    print("MT5 initialization failed:", mt5.last_error())
    quit()

print("MT5 Bridge Active! Connected to MT5 Terminal.")

async def handler(websocket, path):
    print("Client Web Terminal Connected!")
    while True:
        try:
            # Fetch latest tick for Vol 99
            tick_99 = mt5.symbol_info_tick("Volatility 99 Index")
            tick_80 = mt5.symbol_info_tick("Volatility 80 Index")

            payload = {
                "type": "tick_update",
                "VOL_99": {
                    "bid": tick_99.bid if tick_99 else 1482.35,
                    "ask": tick_99.ask if tick_99 else 1482.50,
                    "last": tick_99.last if tick_99 else 1482.35,
                    "spread": round((tick_99.ask - tick_99.bid), 2) if tick_99 else 0.15
                },
                "VOL_80": {
                    "bid": tick_80.bid if tick_80 else 842.10,
                    "ask": tick_80.ask if tick_80 else 842.20,
                    "last": tick_80.last if tick_80 else 842.10,
                    "spread": round((tick_80.ask - tick_80.bid), 2) if tick_80 else 0.10
                }
            }
            await websocket.send(json.dumps(payload))
            await asyncio.sleep(0.5) # 500ms tick stream
        except Exception as e:
            print("Connection error:", e)
            break

async def main():
    async with websockets.serve(handler, "localhost", 8080):
        print("WebSocket Server running at ws://localhost:8080")
        await asyncio.Future()  # run forever

asyncio.run(main())