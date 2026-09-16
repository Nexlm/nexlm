# Onboarding

From a clone to a finished trade on Stellar testnet. Budget half an hour.

You need Node.js 20+, and PostgreSQL 14+ or Docker.

## 1. Run it

```bash
git clone https://github.com/Nexlm/nexlm.git
cd nexlm
npm install
docker compose up -d                    # PostgreSQL on :5432

cp server/.env.example server/.env
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "import('@stellar/stellar-sdk').then(s => console.log('PLATFORM_SECRET_KEY=' + s.Keypair.random().secret()))"
# paste both into server/.env, plus any long JWT_SECRET

npm run db:migrate
npm run dev:server                      # http://localhost:4000
npm run dev:client                      # http://localhost:5173
```

On testnet every new wallet is funded with 10,000 test XLM by Friendbot, and verification emails are
printed to the server log instead of being sent — copy the link from there.

## 2. Do a trade with yourself

Two accounts, two browsers (use a private window for the second):

1. Register both. Copy the verification link from the server log for each.
2. `REQUIRE_KYC=false` in `server/.env` skips BVN/NIN while you're exploring — it's the one shortcut worth taking.
3. As the **seller**: Settings → add a payout account, then Post an order → sell 100 XLM.
4. As the **buyer**: take the offer on the market. Watch the server log — the escrow account is created and the seller's key disabled in one transaction.
5. Open the trade room. Follow the escrow link to stellar.expert and look at the two operations.
6. Buyer marks paid, seller releases. Follow the release link: payment, signer removal, account merge.
7. Now do it again and let the 15-minute timer run out instead. The refund lands by itself.

That loop is the whole product. Everything else — reputation, admin, KYC — hangs off it.

## 3. Find your way around

```
server/src/routes/       thin: validate, call a service, respond
server/src/services/     the rules; the only place that writes to the database
server/src/services/tradeRules.js   pure state machine — read this first
server/src/stellar/      builds and signs transactions; knows nothing about trades
client/src/pages/        one file per screen
client/src/components/   UI kit plus trade, wallet and order pieces
```

[docs/architecture.md](architecture.md) has the diagram and the failure paths.

## 4. Your first change

- Pick an issue labelled **good first issue**. Each one names the files, the expected behaviour and the checks.
- Comment to claim it. If it's still open, it's free — no need to ask permission first.
- Branch, change, add a test ([docs/testing.md](testing.md)), run `npm test`, open a PR against `main`.
- Expect review comments about money handling. They're about the code, not you — see [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).

Stuck for more than an hour? Say so on the issue with what you tried. That's faster than guessing,
and it tells us the task was scoped badly.

## Things that surprise people

- **Amounts are strings.** BigInt minor units in, formatted strings out. A float in a balance is a bug.
- **Nexlm never touches Naira.** Bank transfers happen between traders; the app only records that the buyer says they paid.
- **The escrow key is thrown away.** It signs exactly one transaction, the one that disables it.
- **Unknown ≠ failed.** A Horizon timeout leaves the trade in a transitional state on purpose; reconciliation settles it from what's on-chain.
- **On Vercel there are no sockets.** The client polls and jobs run on traffic. Don't add code that assumes a live socket.
