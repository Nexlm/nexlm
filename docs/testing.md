# Testing

```bash
npm test                  # server + client
npm test -w server        # API, services, Stellar, jobs
npm test -w client        # components, hooks, pages
npm run smoke -w server   # full lifecycle against Stellar testnet (needs a running API)
```

## What lives where

| Suite | Path | What it covers |
| --- | --- | --- |
| Server unit | `server/tests/unit` | Pure helpers, validators, services with the database mocked, Stellar transaction shapes, jobs |
| Server routes | `server/tests/integration` | The real Express app over HTTP, with services mocked: status codes, validation, auth and error bodies |
| Client | `client/src/**/*.test.jsx` | Components, hooks and pages in jsdom with the API mocked |
| Smoke | `server/scripts/smoke-test.mjs` | A real trade on testnet: register, lock, chat, release, cancel, timeout refund, withdraw |

No suite needs a database or a network connection. Prisma is mocked with `vi.mock`, Horizon calls are
mocked at `src/stellar/client.js`, and route tests start the app on an ephemeral port.

## Writing a test

- **Money rules** belong in unit tests with exact strings — `expect(ngnTotal('10', '1500.50')).toBe('15005.00')`, never a float.
- **Trade transitions** go through `tradeRules.js`; add the case there before touching the service.
- **Escrow changes** must assert the operation list and the signatures, not just the returned hash. A release that forgets to remove the platform signer still "works" until you check the operations.
- **Client tests** query by what a trader sees — role, label, visible text — rather than class names.
- **Errors** are part of the contract: assert the `code` as well as the status, because the client branches on it.

## Conventions

- One behaviour per `it`, named as a sentence about the product ("refuses more than the withdrawable balance").
- Mock at the module boundary (`vi.mock('../../src/lib/prisma.js')`), not inside the code under test.
- Prefer a fake clock (`vi.useFakeTimers`) over waiting; deadlines and countdowns are everywhere in this app.
- Keep fixtures small and build them with a factory function so each test states only what matters.

CI runs both suites plus a client build on every push and pull request.
