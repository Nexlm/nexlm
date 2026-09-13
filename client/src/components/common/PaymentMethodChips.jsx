import { paymentMethodLabel } from '../../lib/constants.js';

const COLORS = {
  BANK_TRANSFER: 'border-slate-300 text-slate-700',
  OPAY: 'border-emerald-300 text-emerald-700',
  PALMPAY: 'border-violet-300 text-violet-700',
  KUDA: 'border-fuchsia-300 text-fuchsia-700',
  MONIEPOINT: 'border-sky-300 text-sky-700',
};

export function PaymentMethodChips({ methods }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {methods.map((method) => (
        <span key={method} className={`rounded border-l-2 bg-slate-50 px-1.5 py-0.5 text-xs ${COLORS[method] ?? ''}`}>
          {paymentMethodLabel(method)}
        </span>
      ))}
    </div>
  );
}
