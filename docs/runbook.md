# Runbook

What to do when something goes wrong in production. Every step assumes you have admin access to the
app and read access to the server logs.

## First questions

1. **Is the API up?** `curl https://nexlm-server.vercel.app/health?deep=1` — `status: ok` with
   `database: ok` means the platform is fine and the problem is narrower than it looks.
2. **What did the trader see?** Ask for the reference shown under the error; it is the
   `X-Request-Id` and finds the log line.
3. **Is money involved?** If a trade is open, the XLM is in an escrow account on Stellar. It cannot
   be spent by anyone but the release or refund path, so nothing is lost while you investigate.

## `SERVER_NOT_CONFIGURED` on every request

An environment variable is missing. The response body lists which. Set it in the deployment and
redeploy; the API answers this instead of crashing precisely so the fix is obvious.

## A trade is stuck in PENDING_ESCROW, RELEASING or REFUNDING

This means a Stellar submission returned an unknown outcome. Reconciliation settles it
automatically — every 60 seconds on a long-running server, or on the next API traffic and the daily
cron on Vercel.

To settle now:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://nexlm-server.vercel.app/api/cron/tick
```

What reconciliation decides, from the escrow account itself:

| On-chain state | Result |
| --- | --- |
| Escrow exists, lock memo present | Trade becomes ESCROW_LOCKED, window starts |
| Escrow never created | Trade cancelled as `ESCROW_FAILED`, offer relisted |
| Escrow merged away, release memo present | Trade completed |
| Escrow merged away, refund memo present | Trade cancelled, seller refunded |
| Escrow exists, no closing memo | Trade returns to PAID or ESCROW_LOCKED so the action can be retried |

If a trade is still stuck after a tick, open it in the admin trade view and follow the escrow
address to stellar.expert. The transaction list there is the source of truth.

## A buyer says they paid but the trade timed out

The refund is automatic and final — the XLM is back with the seller. There is no "un-refund".
Tell both parties to settle the Naira between themselves, and check the chat: a payment proof
uploaded before the deadline is the evidence. If the buyer paid late, that is a trader dispute, not
a platform failure.

## A seller released without being paid

Releases cannot be reversed. Check the trade chat and the buyer's payment claim, then:

1. Open the buyer in admin → **Suspend** if the pattern looks deliberate (their active offers are
   cancelled automatically).
2. Note the trade id and the escrow address for the record.
3. If several traders report the same account, **Ban** it.

## Uploads failing with `UPLOADS_NOT_CONFIGURED`

The serverless deployment has no `CLOUDINARY_URL`, so payment proofs cannot be stored. Set it and
redeploy. Text chat keeps working meanwhile.

## Horizon is down

Escrow actions answer `HORIZON_UNAVAILABLE` (503) and nothing moves. Existing trades are safe; the
payment windows keep running, so expect a burst of automatic refunds once Stellar is reachable
again. Check [status.stellar.org](https://status.stellar.org) before investigating further.

## Emails are not arriving

Without `SMTP_HOST` the API logs verification and reset emails instead of sending them — search the
logs for `[email disabled]` and send the link to the trader by hand. Configure SMTP to fix properly.

## Promoting an admin

```bash
DATABASE_URL="<production url>" ADMIN_EMAIL=ops@example.com ADMIN_PASSWORD='…' npm run db:seed -w server
```

Run against an existing email to promote that account instead of creating one.
