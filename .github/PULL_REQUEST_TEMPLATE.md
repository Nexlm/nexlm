# What this changes

<!-- One or two sentences. Link the issue it closes: Closes #123 -->

## How it was tested

<!-- Commands you ran, and what you checked by hand. -->

- [ ] `npm test` passes
- [ ] Checked in the browser / against the API

## Money-moving code

Tick if this PR touches escrow, balances, trade state, payouts or KYC storage:

- [ ] This changes money-moving code

If ticked, confirm:

- [ ] Amounts stay in BigInt minor units (stroops, kobo) — no floating point
- [ ] Trade state changes are atomic and cannot be applied twice
- [ ] A failed or unknown Stellar outcome leaves funds recoverable (reconciliation still works)
- [ ] New rules are covered by unit tests

## Screenshots

<!-- For UI changes. Before and after. -->
