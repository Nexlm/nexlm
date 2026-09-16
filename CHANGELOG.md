# Changelog

Notable changes to the Nexlm app. Dates are the day the change landed on `main`.

## Unreleased

### Added

- OpenAPI 3.1 spec for every endpoint (`docs/api/`), checked against the Express router by a test so
  it cannot drift
- Decision records for escrow, money handling, reconciliation, KYC storage and the serverless
  fallback (`docs/decisions/`)
- Architecture, testing, onboarding and operations runbook guides (`docs/`)
- Request ids: every response carries `X-Request-Id`, errors log it, and the client shows it under a
  failed load
- Per-screen browser titles, a skip-to-content link, and `prefers-reduced-motion` support
- A render error boundary that keeps a crash from blanking the page mid-trade
- Live/polling indicator in the navbar, so it is clear whether updates are pushed or fetched
- Market filters live in the URL, making a filtered view shareable
- Rate limits on trade chat (per room) and order posting (per account)
- `version` on `/` and `/health`, so an operator can tell which build answered
- ESLint across both workspaces, run in CI; coverage reporting via `test:coverage`
- Issue and pull request templates, security policy, code of conduct and Dependabot

### Changed

- Hooks no longer write refs during render or mirror socket state; connection state is read through
  `useSyncExternalStore`
- KYC names accept Yoruba and Igbo tone marks
- `asyncHandler` also catches synchronous throws

### Fixed

- Vercel builds no longer fail when migrations cannot run; the API reports the problem through
  `/health?deep=1` instead
- The not-configured response sends CORS headers, so the browser shows the real error
- Landing and app links point at the deployed URLs instead of a domain that does not exist yet

## 0.1.0 — 2026-09-13

First working version: accounts with Stellar wallets, BVN/NIN verification, a P2P order book,
per-trade on-chain escrow with a 15-minute payment window, trade chat with payment proofs,
reputation, automatic refunds and reconciliation, and an admin console.
