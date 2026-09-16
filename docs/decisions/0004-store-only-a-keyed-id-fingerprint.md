# 4. Store a keyed fingerprint of a BVN/NIN, never the number

**Status:** accepted · **Date:** 2026-08-26

## Context

Nigerian KYC uses the BVN (bank verification number) or NIN (national identity number). Nexlm needs
to (a) check the ID belongs to the person, and (b) stop one ID being used by several accounts — a
common pattern in P2P fraud. Neither requires keeping the number.

A database of BVNs is a target. If it leaks, the damage lands on traders, not on us, and it cannot
be undone by rotating a credential.

## Decision

At submission, the API sends the details to Smile ID for verification and stores only:

- `kycIdHash` — HMAC-SHA256 of `"<type>:<number>"` keyed with `ENCRYPTION_KEY`
- `kycIdLast4` — the last four digits, so a trader recognises which ID they used
- the submitted name, the provider's job id, and timestamps

The full number is never written to the database or a log. Duplicate detection compares fingerprints,
so the check works without ever reading an ID back.

## Consequences

**Good**

- A database dump alone does not expose anyone's BVN. Reversing a fingerprint needs the key as well
  as the number, and guessing is bounded by an 11-digit space *per keyed hash*, not a global rainbow
  table.
- One ID still cannot be linked to two accounts.
- The admin review screen shows a name and `···5678` — enough to match a payout account, nothing
  more.

**Costs**

- Rotating `ENCRYPTION_KEY` invalidates every fingerprint; duplicate detection would need traders to
  re-verify. The key therefore has the same handling rules as the wallet encryption key — because it
  is the same key.
- We cannot re-check an old submission against the provider without asking the trader for the number
  again. That is the intended trade-off.

## Related

Wallet seeds follow the same principle from the other direction: they must be usable, so they are
encrypted with AES-256-GCM and decrypted only in the moment of signing — see
[0001](0001-one-escrow-account-per-trade.md) for why that key can only ever move funds along two paths.
