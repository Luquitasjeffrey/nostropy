# Nostropy Frontend — Agent & LLM Context

## Overview

The frontend is a **Vite + React + TypeScript** single-page app. It communicates with the Express backend via REST API. All USD-denominated values are shown to the user, but the backend stores and transacts in native crypto units (satoshis for BTC, micro-USDT for USDT).

## Directory Structure

```
frontend/
├── index.html
└── src/
    ├── App.tsx                      # Root component, global header, price feed, balance
    ├── index.css                    # Global styles + Tailwind utilities
    ├── assets/
    │   ├── logo.png                 # Nostropy logo (Nostr-inspired)
    │   └── crypto/
    │       ├── btc.svg              # Bitcoin icon (local, NOT external URL)
    │       └── usdt.svg             # Tether icon (local, NOT external URL)
    ├── components/
    │   ├── MinesPage.tsx            # Mines game orchestrator
    │   ├── mines/
    │   │   ├── MinesGrid.tsx        # 5×5 game board
    │   │   └── MinesControls.tsx    # Sidebar: wager input, currency picker, bet/cashout
    │   └── ui/
    │       ├── Button.tsx           # Reusable button component
    │       ├── Input.tsx            # Reusable input with icon
    │       └── Modal.tsx            # Generic modal overlay
    └── lib/
        └── utils.ts                 # Tailwind class merging helper (cn())
```

## Running the Frontend

```bash
cd frontend
npm run dev     # Vite dev server at http://localhost:5173
npm run build   # Production build
```

The `VITE_API_URL` environment variable controls the backend URL (defaults to `http://localhost:5000`).

## State Architecture

### `App.tsx` — Global State
- `playerPubkey` — stored in `localStorage`, represents the logged-in user identity
- `allBalances` — array of `{ symbol, name, image, amount, decimal_places }` fetched from `/api/user/balance`
- `prices` — `{ BTC: number, USDT: number }` fetched from CoinGecko every 60s
- `usdBalance` — computed: sum of all balances converted to USD at current prices

The header shows **total portfolio value in USD** (not per-currency). Price feed uses CoinGecko's free API:
```
https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd
```

### `MinesPage.tsx` — Game State
- `currencySymbol` — which crypto the current bet is in (defaults to `'BTC'`)
- `price` — derived from `prices[currencySymbol]`, used for USD↔crypto conversion
- Manages full game lifecycle: start → reveal cells → cash out / lose

**Props received from App:**
```ts
allBalances: any[]               // Full balance array with metadata
prices: Record<string, number>   // BTC and USDT prices in USD
onGameEnd: () => void            // Triggers balance refresh in App
```

### `MinesControls.tsx` — Controls UI
- Renders the wager input, currency picker, mines count selector, and Bet/Cashout button
- **Currency picker** is an icon-only control embedded inline in the wager input row
  - Shows a local SVG icon (BTC or USDT) 
  - A transparent `<select>` overlaid on top captures click events (native browser dropdown)
  - Positioned to the right of the number input, to the left of the ½ / 2x buttons
- Shows the **current currency's USD balance** next to the "Bet Amount" label

**Props:**
```ts
wager, setWager
minesCount, setMinesCount
startGame, cashOut
status, multiplier, canCash, payout
currencySymbol, setCurrencySymbol  // Controlled by MinesPage
allBalances, prices                // For balance display
```

## USD ↔ Crypto Conversion

All wagers are entered in USD by the user. Before sending to the backend, `MinesPage.tsx` converts:

```ts
const decimals = currencySymbol === 'BTC' ? 8 : 6;  // USDT = 6
const cryptoAmount = wager / price;                  // USD → crypto float
const wagerInt = Math.floor(cryptoAmount * Math.pow(10, decimals)); // → integer
```

On cash out, the backend returns the payout as an integer. The frontend converts back:
```ts
const cryptoPayout = data.payout / Math.pow(10, decimals);
const usdPayout = cryptoPayout * price;
```

## Design System

- **Theme:** Dark (`#06141d` background, `#0f212e` panels)
- **Primary accent:** `#00e701` (bright green) — matches casino aesthetic
- **Danger:** Red for bomb/loss states
- **Typography:** Tailwind utilities, Inter-style system font
- **CSS variables** in `index.css`: `--color-panel`, `--color-background`, `--color-primary`, `--color-danger`
- **Animations:** `framer-motion` for multiplier counter, cell reveals

## Styling Conventions

- **Tailwind CSS** for all layout and styling
- No inline `style={{}}` except when Tailwind can't express the value (e.g. `font-size: 0` to hide invisible `<select>`)
- Custom classes defined in `index.css` using `@layer` directives
- Component files do NOT import their own CSS — all styling is via Tailwind classes

## Key Implementation Notes

### Provably Fair UI
After each game, a "Provably Fair" button opens a modal showing:
- Game ID
- Client Seed
- Server Seed Hash (before reveal) / Server Seed (after reveal)
Players can verify the game outcome independently using any SHA-256 tool.

### Currency Icons
Icons are **local SVG files** in `src/assets/crypto/`. Do NOT reference external URLs for currency icons — the files are already downloaded:

```ts
import btcIcon from '../../assets/crypto/btc.svg';
import usdtIcon from '../../assets/crypto/usdt.svg';

const CURRENCY_ICONS: Record<string, string> = { BTC: btcIcon, USDT: usdtIcon };
```

### Adding a New Game
1. Create a route in the backend under `/api/games/<game-name>/`
2. Use `injectUser` middleware on the router
3. Create a `<GameName>Page.tsx` component similar to `MinesPage.tsx`
4. Add a route in `App.tsx` and a nav entry in the header

### Environment Variable
```
VITE_API_URL=http://localhost:5000   # Backend base URL
```
Accessed in components as:
```ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```
