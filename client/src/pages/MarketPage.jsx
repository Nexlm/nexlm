import { Plus, RefreshCw, Store } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OrderRow } from '../components/orders/OrderRow.jsx';
import { TradeModal } from '../components/orders/TradeModal.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback.jsx';
import { Input, Select } from '../components/ui/Field.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useLiveRefresh, useSocketEvent } from '../hooks/useSocket.js';
import { api } from '../lib/api.js';
import { PAYMENT_METHODS } from '../lib/constants.js';
import { formatNgn } from '../lib/format.js';
import { useAuthStore } from '../store/authStore.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const SIDE_TABS = [
  { value: 'buy', label: 'Buy XLM', activeClass: 'bg-leaf text-ink' },
  { value: 'sell', label: 'Sell XLM', activeClass: 'bg-ember text-ink' },
];

export default function MarketPage() {
  const user = useAuthStore((s) => s.user);
  // Filters live in the URL so a market view can be bookmarked or shared.
  const [params, setParams] = useSearchParams();
  const side = params.get('side') === 'sell' ? 'sell' : 'buy';
  const method = params.get('method') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const [amount, setAmount] = useState(params.get('min') ?? '');
  const [selected, setSelected] = useState(null);
  const debouncedAmount = useDebounce(amount);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  // Buyers browse sell orders; sellers browse buy orders.
  const type = side === 'buy' ? 'SELL' : 'BUY';

  usePageTitle(side === 'buy' ? 'Buy XLM' : 'Sell XLM');

  const { data, loading, error, reload } = useApi(
    () =>
      api.get('/orders', {
        type,
        paymentMethod: method,
        minAmount: /^\d+(\.\d+)?$/.test(debouncedAmount) ? debouncedAmount : undefined,
        page,
      }),
    [type, method, debouncedAmount, page],
  );

  const refreshTimer = useRef();
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => reload({ silent: true }), 800);
  };
  useSocketEvent('order:created', scheduleRefresh);
  useSocketEvent('order:removed', scheduleRefresh);
  useLiveRefresh(() => reload({ silent: true }), 10000);


  const best = data?.items?.[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">P2P market · XLM / NGN</p>
          <h1 className="page-title mt-3">
            {side === 'buy' ? 'Buy XLM' : 'Sell XLM'} with <span className="text-gold">escrow</span> on every trade.
          </h1>
        </div>
        <div className="flex items-end gap-6">
          {best && (
            <div className="text-right">
              <p className="table-head">{side === 'buy' ? 'Best ask' : 'Best bid'}</p>
              <p className="font-display text-3xl font-extrabold tracking-tight">{formatNgn(best.ngnRate)}</p>
            </div>
          )}
          {user && (
            <Link to="/orders/new">
              <Button>
                <Plus className="h-4 w-4" /> Post an order
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <Tabs tabs={SIDE_TABS} value={side} onChange={(value) => setParam('side', value === 'buy' ? '' : value)} />
          <div className="grid flex-1 grid-cols-2 gap-3 lg:ml-3 lg:max-w-md">
            <Input
              placeholder="Min. amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setParam('min', e.target.value);
              }}
              suffix="XLM"
              aria-label="Minimum XLM amount"
            />
            <Select
              aria-label="Payment method"
              value={method}
              onChange={(e) => setParam('method', e.target.value)}
              options={[{ value: '', label: 'All payment methods' }, ...PAYMENT_METHODS]}
            />
          </div>
          <Button variant="ghost" onClick={() => reload()} className="lg:ml-auto" aria-label="Refresh orders">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="table-head hidden grid-cols-12 gap-4 border-b border-line px-5 py-3 md:grid">
          <span className="col-span-3">Advertiser</span>
          <span className="col-span-2">Price</span>
          <span className="col-span-3">Amount</span>
          <span className="col-span-2">Payment</span>
          <span className="col-span-2 text-right">Trade</span>
        </div>

        {loading && !data ? (
          <PageLoader />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Store}
            title={`No ${side === 'buy' ? 'sellers' : 'buyers'} right now`}
            description="Try another payment method, or post your own order so others can trade with you."
          />
        ) : (
          data.items.map((order) => (
            <OrderRow key={order.id} order={order} isOwn={order.user.id === user?.id} onTrade={setSelected} />
          ))
        )}

        <Pagination pagination={data?.pagination} onChange={(next) => setParam('page', String(next))} />
      </div>

      {selected && <TradeModal key={selected.id} order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
