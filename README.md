# MarketM

MarketM is a live multiplayer stock-market simulation for classroom and competitive play.

## Multiplayer

- Host creates a 6-character room code.
- Up to 20 players can join from different phones, tablets, or computers.
- The host is the authoritative game state and can trade while controlling the room.
- Player trade requests are validated by the host before state is broadcast.
- Live prices, portfolios, leaderboard, timer, news shocks, pause/resume and extra-time controls sync across the room.
- Winner gets +2% starting capital in the next round.
- Last place gets +1% comeback capital in the next round.

## Stocks

30 simulated global and Indian companies, including Apple, Microsoft, NVIDIA, Amazon, Tesla, JPMorgan, Reliance, TCS, Infosys, HDFC Bank, SBI, Tata Motors, NTPC and more.

## Networking

The browser client uses PeerJS 1.5.5 and WebRTC data channels. By default it uses the free PeerJS Cloud service for connection signalling. After signalling, game data is exchanged directly between the host and players.

`peer-config.js` can be changed to point the game to the included self-hosted PeerServer backend.

## Self-hosted signalling backend

```bash
npm install
npm start
```

Environment variables:

- `PORT` defaults to `9000`
- `PEER_PATH` defaults to `/marketm`
- `PEER_KEY` defaults to `marketm`

Then set `window.MARKETM_PEER_OPTIONS` in `peer-config.js` to your deployed backend hostname, port, path, key and HTTPS setting.

## Frontend deployment

GitHub Pages can serve this repository directly from `main` / root. `index.html` redirects to the multiplayer client.

## Current architecture note

The host device owns the live match state, so the host tab must remain online for the room to continue. For persistent rooms that survive the host closing the browser, move authoritative room state into a hosted database/realtime backend such as Supabase.

MarketM uses fictional prices and news. It does not connect to a brokerage or use real money.
