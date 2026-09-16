# Contributing to Nexlm

New here? Start with [docs/onboarding.md](docs/onboarding.md) — it takes you from a clone to a
completed trade on testnet in about half an hour, then points at a first task.

## Workflow

1. Branch from `main`: `feat/short-description`, `fix/short-description`.
2. Keep commits small and focused. We use [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(trades): …`, `fix(stellar): …`, `test(server): …`, `docs: …`, `chore: …`.
3. Run `npm test` and `npm run build` before opening a pull request.
4. CI must pass before merging.

## Ground rules for money-moving code

Anything under `server/src/stellar/` or `server/src/services/trade.service.js` moves real funds on mainnet.

- **Never** log, return or store a Stellar secret in plaintext. Use `encryptSecret` / `decryptSecret` and decrypt only right before signing.
- Use the BigInt helpers in `server/src/lib/amount.js` for XLM and NGN. No floating point for amounts.
- State transitions must be claimed atomically (`updateMany` with the expected `status`) so concurrent requests cannot double-release or double-refund.
- Only roll a trade back when Stellar **definitively** rejected the transaction (`STELLAR_TX_FAILED`). Timeouts leave the trade in its transitional state for reconciliation.
- Add or update unit tests in `server/tests/` for rule changes, and run the smoke test (`npm run smoke -w server`) against testnet for escrow changes.

## Code style

- ES modules everywhere, 2-space indentation, single quotes.
- Validate every request body, query and param with zod in `server/src/validators/`.
- Services throw `AppError` helpers from `server/src/lib/errors.js`; routes stay thin.
- Client pages fetch with `useApi` and show loading, empty and error states.
