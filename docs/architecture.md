# Architecture

How the pieces fit together, and why the money-moving parts are shaped the way they are.

```
browser ──HTTP──▶ Express API ──▶ PostgreSQL (trades, orders, users, messages)
   ▲                  │
   │                  ├──▶ Horizon (Stellar testnet/public)
   └──Socket.io───────┘        createAccount · setOptions · payment · accountMerge
      (polling on Vercel)
```

## Layers

| Layer | Directory | Rule |
| --- | --- | --- |
| Routes | `server/src/routes` | Parse and validate input, call one service, shape the response. No business rules. |
| Services | `server/src/services` | All business rules. The only place that writes to the database. |
| Stellar | `server/src/stellar` | Builds, signs and submits transactions. Knows nothing about trades. |
| Lib | `server/src/lib` | Pure helpers: amounts, crypto, errors, pagination, time. No I/O. |
| Jobs | `server/src/jobs` | Expiry, auto-refunds and reconciliation, on a timer or on traffic. |

Pure rules live in `services/tradeRules.js` so trade transitions can be tested without a database.

## Money

Every amount is converted to BigInt minor units before arithmetic — stroops for XLM (7 decimals),
kobo for Naira (2). Floating point never touches a balance. `lib/amount.js` is the only place that
parses or formats money; a value that can't be represented exactly is rejected rather than rounded.

## Escrow

Each trade gets its own Stellar account, funded by the seller with the trade amount plus a 2 XLM
overhead for the account minimum, the platform-signer subentry and fees.

```
lock     seller ─ createAccount(escrow, amount + 2 XLM)
         escrow ─ setOptions(add platform signer, master weight 0)   ← same transaction

release  escrow ─ payment(amount) ─▶ buyer
         escrow ─ setOptions(remove platform signer)
         escrow ─ accountMerge ─▶ seller     (returns the unused overhead)

refund   escrow ─ setOptions(remove platform signer)
         escrow ─ accountMerge ─▶ seller
```

Funding and disabling the escrow key happen in one atomic transaction, so the escrow key is never
usable after the funds land. From then on only the platform co-signer can move them, and the only
operations it ever signs send funds to the buyer or back to the seller.

## Failure handling

Nexlm can always tell what happened on-chain because the escrow address is written to the database
*before* the lock is submitted.

| Outcome | What happens |
| --- | --- |
| Stellar rejects the transaction (`STELLAR_TX_FAILED`) | Nothing moved. The trade is cancelled and the order goes back on the market. |
| Outcome unknown (timeout, Horizon down) | The trade stays in its transitional state. `reconcileTrades` looks up the escrow account and its memos, then settles or restores it. |
| Payment window closes | `autoCancelTrades` refunds the seller. Opening the trade room also settles it lazily. |

Transitions are claimed with a conditional `updateMany`, so two requests can never apply the same
action twice.

## Realtime

A long-running server pushes `order:*`, `trade:*` and `message:new` over Socket.io; sockets are
authenticated with the same JWT and joined only to rooms the user belongs to. On Vercel there is no
socket server, so the client polls (`useLiveRefresh`) and jobs run on incoming traffic plus a daily
cron. Services emit through `socket/io.js`, which is a no-op when no server is attached — that's why
the same service code works in both deployments.
