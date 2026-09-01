# BerylTerminal

A broker-agnostic trading terminal. Frontend → API → Risk Engine → BrokerAdapter → Broker,
per the product spec. This replaces the earlier static HTML demo — this is a real Next.js
app with a database, real market data, and real broker order execution.

## What's actually working right now vs. what needs your setup

| Piece | Status |
|---|---|
| Architecture (DB schema, risk engine, order lifecycle, audit log) | Built, type-checked |
| Market data (Twelve Data) | Built — works the moment you add a free API key |
| Alpaca broker adapter | Built and functional — paper trading works with a free, instant Alpaca signup |
| Webull broker adapter | Scaffolded against their real OpenAPI shape — needs your approved App Key/Secret to finish (see below) |
| IBKR broker adapter | Scaffolded against their real Client Portal Gateway API — needs your running gateway to finish |
| Auth (signup/login, sessions) | Built and functional |
| 2FA | Modeled in the database, not yet enforced in login — flagged as a follow-up, not silently skipped |

Nothing here is faked or simulated data pretending to be real — Alpaca paper trading and
Twelve Data are genuinely live, wired to their real APIs. Webull and IBKR are real code
against their real, documented APIs, but I don't have accounts with either, so I can't
verify those two end-to-end from here — only you can, once you have credentials.

## 1. Get your free credentials (10 minutes, no cost)

**Alpaca (paper trading):**
1. Sign up free at alpaca.markets — no card required for a paper account
2. In the dashboard, switch to "Paper Trading" (top-left) and generate an API key
3. Copy the **API Key ID** and **Secret Key** (the secret is shown once)

**Twelve Data (market data):**
1. Sign up free at twelvedata.com — Basic plan, no card required
2. Copy your API key from the dashboard

## 2. Set up the database

This uses Postgres via Prisma — Supabase works well (same as your TradeBeryl journal app).
1. Create a Supabase project, grab the connection string
2. Set it as `DATABASE_URL`

## 3. Environment variables

Copy `.env.example` to `.env.local` for local dev, or set these directly in Vercel's
Project Settings → Environment Variables for production. Generate the two secret keys with:
```
openssl rand -base64 32
```
Required to start: `DATABASE_URL`, `SESSION_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`,
`TWELVEDATA_API_KEY`. Alpaca keys are entered through the app's "Connect broker" UI, not
as env vars — they get encrypted and stored per-user in the database.

## 4. Run it

```
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Sign up, click "Connect broker" → Alpaca → Paper, paste your keys, and you should see your
real Alpaca paper account balance appear. Type a symbol, watch a real chart populate from
Twelve Data, and place a market order — that's a genuine, real order going through the risk
engine to Alpaca's paper API and filling for real (in the simulated-money sense).

## 5. Webull and IBKR — what's left

**Webull:** apply for OpenAPI access at developer.webull.com (1-2 business day review).
Once approved, open `src/lib/brokers/webull.ts` — the `sign()` method and the actual
endpoint paths are the only things left unfinished; the rest of the adapter (and its
plug-in point into the risk engine/order service) is already wired the same way Alpaca's is.

**IBKR:** requires a funded or paper IBKR account and their Client Portal Gateway running
somewhere you control (it handles IBKR's own login/2FA — this app calls the gateway's local
API, not IBKR directly). Once that gateway is up and logged in, `src/lib/brokers/ibkr.ts`
needs its endpoint calls filled in against your gateway's `/v1/api` docs.

## 6. Going live (real money)

Everything above defaults to paper mode. Moving to live trading for any broker is a mode
switch in the "Connect broker" UI plus real (verified) brokerage credentials — no code
changes. Before you flip that switch on any account you're funding: place several paper
trades first and actually read the audit log / order state history to confirm the risk
engine is rejecting what it should and filling what it should. That verification step is
the whole reason the paper path exists — skipping it is the one shortcut worth not taking.
