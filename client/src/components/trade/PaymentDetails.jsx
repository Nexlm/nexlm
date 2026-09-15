import { paymentMethodLabel } from '../../lib/constants.js';
import { formatNgn } from '../../lib/format.js';
import { CopyButton } from '../ui/CopyButton.jsx';

function Row({ label, value, copy, strong }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
      <dt className="text-sm text-moss">{label}</dt>
      <dd className={`flex items-center gap-1 text-right ${strong ? 'font-display text-xl font-bold' : 'num text-sm text-paper'}`}>
        {value}
        {copy && <CopyButton value={String(value)} label="" />}
      </dd>
    </div>
  );
}

export function PaymentDetails({ account, amount, isBuyer }) {
  if (!account) {
    return <p className="text-sm text-moss">The seller&apos;s payout details are unavailable.</p>;
  }

  return (
    <div>
      <p className="eyebrow">{isBuyer ? 'Send exactly this amount' : 'Buyer pays into your account'}</p>
      <dl className="mt-3">
        <Row label="Amount" value={formatNgn(amount)} strong />
        <Row label="Method" value={paymentMethodLabel(account.method)} />
        {account.bankName && <Row label="Bank" value={account.bankName} />}
        <Row label="Account name" value={account.accountName} copy={isBuyer} />
        <Row label="Account number" value={account.accountNumber} copy={isBuyer} />
      </dl>
      {isBuyer && (
        <p className="mt-3 text-xs text-moss">
          Pay from an account in your own name. Don&apos;t mention crypto, XLM or Nexlm in the narration.
        </p>
      )}
    </div>
  );
}
