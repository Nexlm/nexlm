# Decision records

Short notes on choices that are expensive to reverse, written when the choice was made. Each says
what the alternatives were and what the decision costs — the part that gets lost otherwise.

| # | Decision |
| --- | --- |
| [0001](0001-one-escrow-account-per-trade.md) | One Stellar escrow account per trade |
| [0002](0002-money-in-bigint-minor-units.md) | Money is BigInt minor units, never floats |
| [0003](0003-unknown-outcomes-are-reconciled.md) | An unknown Stellar outcome is reconciled, never rolled back |
| [0004](0004-store-only-a-keyed-id-fingerprint.md) | Store a keyed fingerprint of a BVN/NIN, never the number |
| [0005](0005-serverless-falls-back-to-polling.md) | Serverless deployments poll instead of holding sockets |

## Writing one

Add a numbered file when a change would be hard to undo — anything touching escrow, money handling,
identity data, or where the app can run. Keep it to a page: context, decision, consequences (good and
bad), and what would make you revisit it. A record is never edited after it is accepted; write a new
one that supersedes it.
