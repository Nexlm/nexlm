# 3. An unknown Stellar outcome is reconciled, never rolled back

**Status:** accepted · **Date:** 2026-08-24

## Context

Submitting a transaction to Horizon has three outcomes, not two: it succeeded, it definitively
failed, or we don't know — a timeout, a dropped connection, a 5xx from Horizon. The dangerous case is
the third. Rolling back a trade because the request timed out can free an order whose escrow was in
fact funded, and leave XLM sitting in an account no trade points at.

## Decision

Treat "unknown" as its own state and settle it from the chain.

1. The escrow address is generated and **written to the trade before** the lock is submitted, so the
   funds are always traceable.
2. Only `STELLAR_TX_FAILED` — Stellar telling us the transaction was rejected — triggers a rollback.
3. Anything else leaves the trade in its transitional state (`PENDING_ESCROW`, `RELEASING`,
   `REFUNDING`) and is logged.
4. `reconcileTrades` picks up trades that have sat in a transitional state for more than two minutes
   — longer than the 60-second transaction timeout, so nothing in flight can still land — looks up
   the escrow account and its memos, and settles or restores the trade accordingly.

Every transition is claimed with a conditional `updateMany`, so a reconciliation and a user action
racing each other cannot both apply.

## Consequences

**Good**

- No state where money moved on-chain but the database says otherwise, or the reverse.
- A 5xx during release is recoverable without human intervention; the memos (`nexlm escrow
  lock/release/refund`) make the on-chain record self-describing.
- Works identically on Vercel, where reconciliation runs on incoming traffic and a daily cron
  instead of a timer.

**Costs**

- A trade can sit "in progress" for a couple of minutes after an outage before it settles.
- Every escrow operation needs a memo and a matching reconciliation branch; adding a new one means
  updating `reconcileTrade`.
- The reconciliation path is the hardest code in the repo to hold in your head, so it carries the
  most tests.
