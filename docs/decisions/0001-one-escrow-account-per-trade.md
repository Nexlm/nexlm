# 1. One Stellar escrow account per trade

**Status:** accepted · **Date:** 2026-08-20

## Context

A P2P trade needs the seller's XLM held somewhere neither party can take it from until the Naira
arrives. The options were:

1. **A platform pool account.** All escrowed XLM in one account, with balances tracked in the
   database.
2. **A multisig account per seller**, funded once and reused across trades.
3. **A fresh account per trade**, funded by the seller when the trade opens.

## Decision

A fresh account per trade. The trade transaction does two things atomically: `createAccount` with
the trade amount plus 2 XLM of overhead, and `setOptions` that adds the platform as signer and sets
the escrow's own master weight to 0.

## Consequences

**Good**

- A trader can verify their own trade on a block explorer without trusting our database. The escrow
  address is in the trade room; the operations are public.
- Nothing is commingled. A bug in one trade cannot spend another trade's funds, and a compromised
  platform key can still only send funds to that trade's buyer or back to its seller.
- The escrow key signs exactly one transaction — the one that disables it — and is then discarded.
- Reconciliation is simple: look up the account, read its memos, and the on-chain state answers what
  happened.

**Costs**

- 2 XLM of overhead per trade (account minimum, signer subentry, fees), returned to the seller by
  the closing `accountMerge`. Sellers must hold it, so it is counted in `committedToOrders`.
- Three operations to close a trade instead of one balance update.
- The seller pays a small transaction fee to open a trade.

## Why not the alternatives

A pool account makes the database the source of truth for other people's money — exactly the trust
assumption P2P escrow exists to remove, and an operational trap where one accounting bug is a loss
across all trades. A reused per-seller account keeps the signer configuration around between trades,
so a stale signature or an old authorisation stays dangerous long after the trade it belonged to.
