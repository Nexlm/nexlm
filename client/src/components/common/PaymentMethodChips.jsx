import { paymentMethodLabel } from '../../lib/constants.js';

export function PaymentMethodChips({ methods }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {methods.map((method) => (
        <span key={method} className="rounded-full border border-line bg-ink px-2.5 py-0.5 text-xs font-medium text-soft">
          {paymentMethodLabel(method)}
        </span>
      ))}
    </div>
  );
}
