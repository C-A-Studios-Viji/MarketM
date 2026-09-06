# MarketM

Competitive browser-based stock market game.

## Features

- Create a room with a six-character code
- Host can trade while controlling the match
- 30 global and Indian companies
- Simulated market movement
- Random market headlines every two minutes
- Buy and sell shares
- Portfolio cash, holdings, P&L and net worth
- Live leaderboard
- Host controls: Start, Pause, +30 seconds, +1 minute, +5 minutes and End Game
- Winner gets +2% starting capital for the next round
- Last place gets a +1% comeback boost for the next round
- Responsive dark trading-terminal interface

## Run

Open `index.html` in a modern browser.

## GitHub Pages

The site is ready to serve from the repository root on the `main` branch.

Go to **Settings → Pages → Build and deployment → Deploy from a branch**, choose **main** and **/(root)**, then save.

## Multiplayer note

The static GitHub version synchronizes tabs/windows in the same browser with browser storage and `BroadcastChannel`. True cross-device multiplayer needs a realtime backend such as Firebase, Supabase, or WebSockets.

MarketM is an educational simulation. It does not use real money or brokerage APIs.
