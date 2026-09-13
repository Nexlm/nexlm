import { estimateNgn, formatNgn, formatXlm } from '../../lib/format.js';
import { PaymentMethodChips } from '../common/PaymentMethodChips.jsx';
import { TraderBadge } from '../common/TraderBadge.jsx';
import { Button } from '../ui/Button.jsx';

export function OrderRow({ order, isOwn, onTrade }) {
  const takerBuys = order.type === 'SELL';

  return (
    <div className="grid gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 md:grid-cols-12 md:items-center">
      <div className="md:col-span-3">
        <TraderBadge user={order.user} />
      </div>

      <div className="md:col-span-2">
        <p className="text-xs text-slate-500 md:hidden">Price</p>
        <p className="text-lg font-semibold text-slate-900">
          {formatNgn(order.ngnRate)}
          <span className="ml-1 text-xs font-normal text-slate-500">/ XLM</span>
        </p>
      </div>

      <div className="md:col-span-3">
        <p className="text-xs text-slate-500 md:hidden">Amount</p>
        <p className="font-medium text-slate-900">{formatXlm(order.xlmAmount)}</p>
        <p className="text-xs text-slate-500">≈ {formatNgn(estimateNgn(order.xlmAmount, order.ngnRate))}</p>
      </div>

      <div className="md:col-span-2">
        <PaymentMethodChips methods={order.paymentMethods} />
      </div>

      <div className="md:col-span-2 md:text-right">
        {isOwn ? (
          <span className="text-xs text-slate-400">Your order</span>
        ) : (
          <Button
            variant={takerBuys ? 'success' : 'danger'}
            className="w-full md:w-auto"
            onClick={() => onTrade(order)}
          >
            {takerBuys ? 'Buy XLM' : 'Sell XLM'}
          </Button>
        )}
      </div>
    </div>
  );
}
