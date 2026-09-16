# 5. Serverless deployments poll instead of holding sockets

**Status:** accepted · **Date:** 2026-09-14

## Context

The app was built around Socket.io: order book updates, trade state changes and chat all arrive as
events, and background jobs run on timers inside the process. Vercel functions have neither — no
long-lived connection, no process alive between requests.

The choice was to keep one deployment target, run two codebases, or make the same code work in both.

## Decision

Make the same code work in both, with realtime as an enhancement rather than a requirement.

- Services emit through `socket/io.js`, whose helpers are no-ops until a server is attached. Nothing
  in a service knows whether sockets exist.
- `env.isServerless` (set from `VERCEL`) switches the API into on-demand mode: `/health` reports
  `realtime: false`, and `runDueJobs` runs expiry, auto-refunds and reconciliation on incoming API
  traffic, throttled to once every 15 seconds per instance, plus a daily cron endpoint.
- The trade room settles an overdue trade lazily when anyone opens it, so a viewer never sees a stale
  "awaiting payment" state even if no job has run.
- The client checks whether the socket is connected (`useSocketConnected`) and polls on an interval
  when it is not (`useLiveRefresh`), pausing in background tabs. The navbar says which mode is
  active.

## Consequences

**Good**

- One codebase deploys to Vercel (zero-ops, free tier) or to a long-running host via `render.yaml`
  for instant updates.
- Reviewers and grant assessors can open a live URL without us running servers.
- Nothing about correctness depends on realtime: money moves through the API, and jobs are
  idempotent because every transition is claimed atomically.

**Costs**

- On Vercel, updates lag by up to a few seconds and chat feels less immediate.
- Background work depends on traffic; a completely idle deployment settles trades on the cron tick.
- Two paths to test. The suites cover both by asserting on `env.isServerless` behaviour and on the
  polling hook.

## Revisit when

Trade volume makes the polling load heavier than a small always-on server, or a feature needs true
push (typing indicators already degrade, notifications would not).
