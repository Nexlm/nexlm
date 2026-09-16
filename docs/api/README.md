# API reference

[`openapi.yaml`](openapi.yaml) describes every endpoint the API serves. Paths are split by area
under [`paths/`](paths) and share the schemas and responses defined in the root file.

```
openapi.yaml       info, servers, shared schemas, and one $ref per path
paths/auth.yaml    registration, sessions, email and password flows
paths/users.yaml   profile, payout accounts, public profiles, KYC
paths/orders.yaml  the order book
paths/trades.yaml  the trade lifecycle and chat
paths/wallet.yaml  balances, deposits, activity, withdrawals
paths/admin.yaml   operations dashboard, user and trade review
```

## Reading it

Any OpenAPI 3.1 viewer works. Without installing anything:

```bash
npx @redocly/cli preview-docs docs/api/openapi.yaml
```

Or paste the file into [editor.swagger.io](https://editor.swagger.io). External `$ref`s resolve
relative to the root file, so keep the directory structure when copying it elsewhere.

## Keeping it honest

`server/tests/unit/docs/openapi.test.js` compares the spec against the Express router on every test
run: add a route without documenting it, or document one that no longer exists, and the suite fails.
That check is why this file can be trusted as the reference rather than a stale copy.

## Conventions

- **Amounts are decimal strings.** XLM to 7 places, Naira to 2. Parse with a decimal library.
- **Branch on `error.code`, never on `error.message`** — messages are written for traders and change.
- **Every response carries `X-Request-Id`.** Log it; quote it in a bug report.
- **`401` means the session is gone, `403` means the account cannot do this yet** — `KYC_REQUIRED`
  and `EMAIL_NOT_VERIFIED` both arrive as 403 with a code the client turns into a link.
- **A 5xx on an escrow action never means the money is lost.** The trade stays in its transitional
  state and reconciliation settles it from what is on-chain.
