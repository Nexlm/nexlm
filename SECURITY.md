# Security policy

Nexlm moves real value: a bug in escrow, balances or trade state can take money from a trader.
Please report anything suspicious privately before it becomes public.

## Reporting a vulnerability

- Open a [private advisory](https://github.com/Nexlm/nexlm/security/advisories/new), or email **security@nexlm.app**.
- Include the steps to reproduce, the impact you think it has, and any trade or order ids involved.
- Never include wallet seeds, JWTs, `.env` contents, BVN/NIN numbers or bank details.
- Please don't open a public issue, post the details in a trade chat, or test against other people's trades.

You can expect an acknowledgement within 3 working days and an assessment within 10.
We'll tell you when a fix ships and credit you in the release notes unless you'd rather stay anonymous.

## In scope

- Escrow: anything that lets XLM leave an escrow account other than to the buyer on release or the seller on refund
- Trade state: skipping the payment window, double release, replaying an action, or acting as another party
- Authentication and sessions, including token handling and account restrictions
- Access control on the API and on socket rooms
- KYC data: anything that exposes a full BVN/NIN, the keyed fingerprint, or another user's identity details
- Wallet secrets: anything that exposes an encrypted seed or lets it be decrypted or used

## Out of scope

- Testnet XLM having no monetary value, or Friendbot funding limits
- Reports from automated scanners with no working proof of concept
- Missing rate limits on endpoints that don't move money or send email
- Social engineering of traders, and scams that don't rely on a flaw in Nexlm

## Handling of trader data

Only a keyed fingerprint and the last four digits of a BVN/NIN are stored — never the full number.
Wallet seeds are encrypted with AES-256-GCM and decrypted only to sign a transaction.
If a report involves either, say so and we'll treat it as highest priority.
