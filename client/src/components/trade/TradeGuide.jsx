import { CANCEL_REASONS } from '../../lib/constants.js';
import { formatNgn, formatXlm } from '../../lib/format.js';
import { Alert } from '../ui/Feedback.jsx';

/** Explains what the current user should do next, based on role and trade status. */
export function TradeGuide({ trade }) {
  const buyer = trade.role === 'BUYER';
  const ngn = formatNgn(trade.ngnAmount);
  const xlm = formatXlm(trade.xlmAmount);

  switch (trade.status) {
    case 'PENDING_ESCROW':
      return (
        <Alert tone="info" title="Locking escrow on Stellar">
          The seller&apos;s XLM is being moved into escrow. This normally takes a few seconds.
        </Alert>
      );
    case 'ESCROW_LOCKED':
      return buyer ? (
        <Alert tone="warning" title={`Send ${ngn} to the seller`}>
          {xlm} is locked in escrow for you. Transfer the exact amount to the account below, then tap{' '}
          <strong>I have paid</strong> before the timer runs out.
        </Alert>
      ) : (
        <Alert tone="info" title="Waiting for the buyer to pay">
          Your {xlm} is safely locked in escrow. If the buyer doesn&apos;t pay in time, it&apos;s returned to you automatically.
        </Alert>
      );
    case 'PAID':
      return buyer ? (
        <Alert tone="info" title="Waiting for the seller to release">
          The seller has been notified. Share your payment receipt in the chat to speed things up.
        </Alert>
      ) : (
        <Alert tone="warning" title={`The buyer says they sent ${ngn}`}>
          Open your bank or wallet app and confirm the money has <strong>actually arrived</strong> before releasing. Never
          release based on a screenshot alone.
        </Alert>
      );
    case 'RELEASING':
      return <Alert tone="info" title="Releasing XLM from escrow…" />;
    case 'REFUNDING':
      return <Alert tone="info" title="Returning XLM to the seller…" />;
    case 'COMPLETED':
      return (
        <Alert tone="success" title="Trade complete">
          {buyer ? `${xlm} has been sent to your Nexlm wallet.` : `${xlm} was released to the buyer.`}
        </Alert>
      );
    case 'CANCELLED':
      return (
        <Alert tone="error" title="Trade cancelled">
          {CANCEL_REASONS[trade.cancelReason] ?? 'This trade was cancelled.'} Escrowed XLM was returned to the seller.
        </Alert>
      );
    default:
      return null;
  }
}
