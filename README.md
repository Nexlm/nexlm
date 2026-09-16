# Nexlm

**Peer-to-peer XLM ↔ Naira exchange with on-chain Stellar escrow.**

Nexlm lets Nigerians buy and sell XLM directly with each other using bank transfer, OPay, PalmPay, Kuda and Moniepoint. The seller's XLM is locked in a dedicated Stellar escrow account for every trade, so neither side has to trust the other — and Nexlm never touches the Naira.

| Repository | Purpose |
| --- | --- |
| [Nexlm/nexlm](https://github.com/Nexlm/nexlm) | Trading app — API + web client (this repo) |
| [Nexlm/nexlm-landing](https://github.com/Nexlm/nexlm-landing) | Marketing website |
| [Nexlm/nexlm-docs](https://github.com/Nexlm/nexlm-docs) | User, developer and API documentation |

## Features (Phase 1 MVP)

- **Accounts** — email registration and verification, password reset, JWT sessions, rate-limited auth
- **Stellar wallet** — a keypair is generated per user (secret encrypted with AES-256-GCM), funded by Friendbot on testnet; balances, QR deposits, withdrawals and on-chain activity via Horizon
- **KYC** — BVN/NIN verification through Smile ID, with manual admin review as a fallback; only a keyed fingerprint and last four digits are stored
- **P2P order board** — buy and sell orders with price, payment methods and terms, sorted best price first, auto-expiring after 30 minutes
- **Escrow trades** — per-trade escrow lock, 15-minute payment window, mark as paid, release, cancel and automatic refunds on timeout
- **Trade chat** — realtime Socket.io chat with payment-proof image uploads (magic-byte validated, Cloudinary or local disk)
- **Reputation** — completed trades and completion rate on offers and public profiles
- **Admin** — overview dashboard, user search/suspension, KYC review, trade monitoring with read-only chat
- **Reliability** — atomic state transitions, reconciliation of trades whose Stellar outcome was unknown

## How escrow works

```
lock     seller ─ createAccount(escrow, amount + 2 XLM) ─▶ escrow
         escrow ─ setOptions(add platform signer, master weight 0)

release  escrow ─ payment(amount) ─▶ buyer
         escrow ─ setOptions(remove platform signer)
         escrow ─ accountMerge ─▶ seller      (returns unused reserve)

refund   escrow ─ setOptions(remove platform signer)
         escrow ─ accountMerge ─▶ seller
```

The escrow's own key is disabled in the same atomic transaction that funds it, so only the platform co-signer can move the XLM — and the only operations it ever signs send funds to the buyer or back to the seller. Every step is a public transaction linked from the trade room.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, Zustand, React Router |
| Backend | Node.js, Express, Zod |
| Database | PostgreSQL, Prisma |
| Blockchain | `@stellar/stellar-sdk`, Horizon |
| Realtime | Socket.io |
| Auth | JWT, bcrypt |
| Uploads | Cloudinary (local disk fallback) |
| KYC | Smile ID |

## Getting started

Requirements: Node.js 20+, PostgreSQL 14+ (or Docker).

```bash
git clone https://github.com/Nexlm/nexlm.git
cd nexlm
npm install

# Database
docker compose up -d

# Server configuration
cp server/.env.example server/.env
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "import('@stellar/stellar-sdk').then(s => console.log('PLATFORM_SECRET_KEY=' + s.Keypair.random().secret()))"
# paste both values and a long JWT_SECRET into server/.env

npm run db:migrate
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-one1' npm run db:seed

# Run
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

On testnet, new wallets are funded automatically with 10,000 test XLM. Without SMTP configured, verification and reset emails are printed to the server log.

## Deploying to Vercel

The repo deploys as two Vercel projects from `main`:

| Project | Root Directory | Preset | URL |
| --- | --- | --- | --- |
| `nexlm-server` | `server` | Other | https://nexlm-server.vercel.app |
| `nexlm-client` | `client` | Vite | https://nexlm-client.vercel.app |

1. Create a Postgres database (e.g. Neon via Vercel Marketplace).
2. In `nexlm-server`, set `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `PLATFORM_SECRET_KEY`, `CRON_SECRET`, `CLIENT_URL=https://nexlm-client.vercel.app`, `PUBLIC_API_URL=https://nexlm-server.vercel.app` (plus `CLOUDINARY_URL` for image uploads) and redeploy. Migrations run during the build.
3. In `nexlm-client`, set `VITE_API_URL=https://nexlm-server.vercel.app` and redeploy.
4. Check `https://nexlm-server.vercel.app/health`. If a variable is missing, the API answers with `SERVER_NOT_CONFIGURED` and lists it.

On Vercel the API runs serverless: Socket.io is replaced by client polling, and expiry/refund/reconciliation jobs run on incoming traffic plus a cron endpoint. For always-on realtime, deploy the API with `render.yaml` instead. Full guide: [docs → Deployment](https://github.com/Nexlm/nexlm-docs/blob/main/docs/developers/deployment.md).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev:server` | API with auto-reload |
| `npm run dev:client` | Web client |
| `npm test` | Server and client unit tests |
| `npm run build` | Production build of the client |
| `npm run db:migrate` | Apply Prisma migrations in development |
| `npm run db:seed` | Create or promote an admin |
| `npm run smoke -w server` | End-to-end test against a running API on testnet |

## Project structure

```
server/
  prisma/            schema, migrations, admin seed
  scripts/           testnet smoke test
  src/
    config/          env validation, constants
    lib/             amounts (BigInt), crypto, errors, pagination
    stellar/         Horizon client, wallets, payments, escrow
    services/        auth, wallet, orders, trades, chat, KYC, admin
    routes/          Express routers
    middleware/      auth, validation, rate limits, uploads, errors
    socket/          Socket.io auth and rooms
    jobs/            order expiry, auto-refunds, reconciliation
  tests/             unit tests (Vitest)
client/
  src/
    pages/           market, orders, trades, wallet, KYC, settings, admin
    components/      UI kit, trade room, wallet, layout
    store/           Zustand auth and toast stores
    hooks/ lib/      API client, sockets, formatting
```

## API overview

All routes are under `/api`. Machine-readable reference: [docs/api/openapi.yaml](docs/api/openapi.yaml)
(kept in step with the router by a test). Narrative guides: [nexlm-docs](https://github.com/Nexlm/nexlm-docs).

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register` · `/login` · `/verify-email` · `/forgot-password` · `/reset-password` · `/change-password` |
| Users | `GET/PATCH /users/me` · `/users/me/payment-accounts` · `GET /users/:displayName` |
| KYC | `GET /kyc` · `POST /kyc` |
| Wallet | `GET /wallet` · `/wallet/deposit` · `/wallet/activity` · `/wallet/transactions` · `POST /wallet/withdraw` |
| Orders | `GET /orders` · `/orders/mine` · `/orders/:id` · `POST /orders` · `/orders/:id/cancel` |
| Trades | `GET/POST /trades` · `GET /trades/:id` · `POST /trades/:id/paid` · `/release` · `/cancel` · `GET/POST /trades/:id/messages` |
| Admin | `GET /admin/overview` · `/admin/users` · `PATCH /admin/users/:id/status` · `POST /admin/kyc/:id` · `GET /admin/trades` |

Realtime events: `order:created`, `order:removed`, `trade:created`, `trade:updated`, `message:new`, `trade:typing`.

## Testing

- **Server unit tests** cover amount math, encryption, validators, trade state rules, services with the database mocked, escrow transaction shapes and the background jobs.
- **Route tests** run the real Express app over HTTP and check status codes, validation, auth gates and error bodies.
- **Client tests** render components, hooks and pages in jsdom with the API mocked.
- **Smoke test** (`server/scripts/smoke-test.mjs`) runs a full lifecycle on Stellar testnet: registration, escrow lock, chat upload, release, cancel, timeout auto-refund and withdrawal.

See [docs/testing.md](docs/testing.md) for conventions, and [docs/architecture.md](docs/architecture.md) for how the layers fit together.

## Roadmap

- **Phase 2** — ratings and reviews, disputes with admin resolution, 2FA, notifications, analytics
- **Phase 3** — partial fills, live market pricing, advanced order management, referrals, mobile app

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), especially the rules for money-moving code.
