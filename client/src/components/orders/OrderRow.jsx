import { estimateNgn, formatNgn, formatXlm } from '../../lib/format.js';
import { PaymentMethodChips } from '../common/PaymentMethodChips.jsx';
import { TraderBadge } from '../common/TraderBadge.jsx';
import { Button } from '../ui/Button.jsx';

export function OrderRow({ order, isOwn, onTrade }) {
  const takerBuys = order.type === 'SELL';

  return (
    <div className="grid gap-4 border-b border-line px-5 py-5 transition-colors last:border-b-0 hover:bg-raised/50 md:grid-cols-12 md:items-center">
      <div className="md:col-span-3">
        <TraderBadge user={order.user} />
      </div>

      <div className="md:col-span-2">
        <p className="table-head md:hidden">Price</p>
        <p className="font-display text-2xl font-bold tracking-tight text-paper">
          {formatNgn(order.ngnRate)}
          <span className="ml-1 font-mono text-[11px] font-normal text-moss">/XLM</span>
        </p>
      </div>

      <div className="md:col-span-3">
        <p className="table-head md:hidden">Amount</p>
        <p className="num font-semibold text-paper">{formatXlm(order.xlmAmount)}</p>
        <p className="num text-xs text-moss">≈ {formatNgn(estimateNgn(order.xlmAmount, order.ngnRate))}</p>
      </div>

      <div className="md:col-span-2">
        <PaymentMethodChips methods={order.paymentMethods} />
      </div>

      <div className="md:col-span-2 md:text-right">
        {isOwn ? (
          <span className="font-mono text-[11px] uppercase tracking-wider text-moss">Your order</span>
        ) : (
          <Button variant={takerBuys ? 'success' : 'danger'} className="w-full md:w-auto" onClick={() => onTrade(order)}>
            {takerBuys ? 'Buy XLM' : 'Sell XLM'}
          </Button>
        )}
      </div>
    </div>
  );
}
