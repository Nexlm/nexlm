import { paymentMethodLabel } from '../../lib/constants.js';
import { formatNgn } from '../../lib/format.js';
import { CopyButton } from '../ui/CopyButton.jsx';

function Row({ label, value, copy }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="flex items-center gap-1 text-right text-sm font-medium text-slate-900">
        {value}
        {copy && <CopyButton value={String(value)} label="" />}
      </span>
    </div>
  );
}

export function PaymentDetails({ account, amount, isBuyer }) {
  if (!account) {
    return <p className="text-sm text-slate-500">The seller&apos;s payout details are unavailable.</p>;
  }

  return (
    <div>
      <p className="mb-2 text-sm text-slate-600">
        {isBuyer ? 'Send exactly this amount to the seller:' : 'The buyer will pay into your account:'}
      </p>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4">
        <Row label="Amount" value={formatNgn(amount)} />
        <Row label="Method" value={paymentMethodLabel(account.method)} />
        {account.bankName && <Row label="Bank" value={account.bankName} />}
        <Row label="Account name" value={account.accountName} copy={isBuyer} />
        <Row label="Account number" value={account.accountNumber} copy={isBuyer} />
      </div>
      {isBuyer && (
        <p className="mt-2 text-xs text-slate-500">
          Pay from an account in your own name. Don&apos;t mention crypto, XLM or Nexlm in the transfer narration.
        </p>
      )}
    </div>
  );
}
