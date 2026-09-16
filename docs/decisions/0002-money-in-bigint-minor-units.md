# 2. Money is BigInt minor units, never floats

**Status:** accepted · **Date:** 2026-08-21

## Context

Nexlm handles two currencies with different precision: XLM has 7 decimal places (stroops), Naira has
2 (kobo). A trade multiplies one by the other — 250 XLM at ₦1,500.50 — and the result is what a
trader is told to send. `0.1 + 0.2 === 0.30000000000000004` is not an acceptable answer when the
difference is somebody's money.

## Decision

All arithmetic happens in BigInt minor units. `server/src/lib/amount.js` is the only module that
parses or formats money:

- `toStroops` / `toKobo` parse a decimal string (or a Prisma `Decimal`) and **reject** anything they
  cannot represent exactly, rather than rounding it.
- `fromStroops` / `fromKobo` format back to strings.
- `ngnTotal` multiplies in minor units and rounds half-up to the kobo.

Amounts cross the API as strings, are stored as Postgres `decimal`, and are never turned into a
JavaScript `number` anywhere a balance or total is derived.

## Consequences

**Good**

- Totals are exact and reproducible; the same trade always produces the same Naira figure.
- Bad input fails loudly at the boundary instead of silently becoming a slightly wrong number.
- The rules are testable without a database: exact-string assertions like
  `ngnTotal('10', '1500.50') === '15005.00'`.

**Costs**

- Every service works with strings and BigInts; developers must resist "just" using `Number()`.
- The client formats for display only — the server's `ngnAmount` is authoritative and the UI's
  `estimateNgn` is explicitly labelled an estimate.

## Enforcement

`CONTRIBUTING.md` calls this out for money-moving code, and the amount helpers are among the most
heavily tested modules in the repo. A float that reaches a balance is a bug, not a style preference.
