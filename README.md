# SolScan — Solana Wallet Dashboard

A real-time Solana portfolio tracker with transaction history, PnL analysis, transaction simulation, and shareable portfolio snapshots.

---

## Screenshot

> _Add screenshots here_

| Dashboard | Transaction Feed | Simulator |
|-----------|-----------------|-----------|
| ![Dashboard](docs/screenshot-dashboard.png) | ![Transactions](docs/screenshot-transactions.png) | ![Simulator](docs/screenshot-simulator.png) |

---

## Features

- **Portfolio Overview** — SOL balance + all SPL token holdings with live USD values via CoinGecko
- **Transaction History** — last 50 on-chain transactions, categorised (Swap / Transfer / NFT / DeFi / Failed) with before/after token diffs
- **PnL Engine** — realized PnL per swap using Jupiter price data; best/worst trade, total inflow/outflow
- **Transaction Simulator** — paste any base64-encoded transaction and simulate it before signing; shows balance changes, compute units, fee in USD, and risk flags
- **Share Portfolio** — serialize portfolio state into a compressed URL; shareable read-only page with Open Graph meta tags
- **Risk Analysis** — flags unverified programs, large SOL movements, multi-program complexity, and token drains
- **Global Toast Notifications** — success/error feedback for all async actions
- **Error Boundaries** — each dashboard section fails independently without breaking the page
- **Resilient RPC** — configurable QuickNode endpoint with 3-retry exponential backoff, 10s timeout, and dev latency logging

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Language | TypeScript (utils/hooks) + JSX (components) |
| Wallet | Solflare via `@solana/wallet-adapter` |
| Blockchain | `@solana/web3.js` v1 |
| Styling | Tailwind CSS v3 |
| Routing | React Router v6 |
| Price Data | Jupiter Price API v2, CoinGecko |
| Token Metadata | Jupiter Token List |
| Testing | Vitest + Testing Library |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [QuickNode](https://www.quicknode.com/) Solana mainnet endpoint (or use the public RPC — rate-limited)
- [Solflare](https://solflare.com/) browser extension

### 1. Clone

```bash
git clone https://github.com/your-username/solscan.git
cd solscan
```

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values (see [Environment Variables](#environment-variables) below).

### 4. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and connect your Solflare wallet.

### 5. Build for production

```bash
npm run build
npm run preview
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SOLANA_RPC_URL` | Recommended | Solana mainnet RPC endpoint. Defaults to the public endpoint if omitted (rate-limited). |
| `VITE_API_BASE_URL` | Optional | Base URL for the proxy API server. Defaults to `https://api.eitherway.ai`. |

See `.env.example` for a ready-to-copy template.

---

## How Solflare is Integrated

SolScan uses the official `@solana/wallet-adapter` ecosystem to integrate Solflare. The `WalletContextProvider` (`src/context/WalletContextProvider.jsx`) wraps the entire application with three providers: `ConnectionProvider` (which holds the RPC connection and passes a custom resilient `fetch` function for retry/timeout logic), `WalletProvider` (configured with `SolflareWalletAdapter` as the sole adapter and `autoConnect: false` to respect user intent), and `WalletModalProvider` (which renders the Solflare connect modal triggered by the `WalletMultiButton` in the header and connect prompt).

Once connected, all data-fetching hooks (`usePortfolio`, `useTransactions`) consume the wallet's `publicKey` and `connection` via `useWallet()` and `useConnection()` from `@solana/wallet-adapter-react`. The app is entirely read-only — it never requests transaction signing from the user. The transaction simulator accepts externally-provided base64 transactions and calls `simulateTransaction` with `sigVerify: false`, so no wallet interaction is required for simulation either.

---

## Live Demo

> _Add your deployed URL here — e.g. https://solscan.vercel.app_

---

## License

MIT — see [LICENSE](LICENSE)
