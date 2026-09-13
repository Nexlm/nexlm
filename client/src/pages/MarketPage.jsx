import { Plus, RefreshCw, Store } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { OrderRow } from '../components/orders/OrderRow.jsx';
import { TradeModal } from '../components/orders/TradeModal.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback.jsx';
import { Input, Select } from '../components/ui/Field.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useSocketEvent } from '../hooks/useSocket.js';
import { api } from '../lib/api.js';
import { PAYMENT_METHODS } from '../lib/constants.js';
import { useAuthStore } from '../store/authStore.js';

const SIDE_TABS = [
  { value: 'buy', label: 'Buy XLM', activeClass: 'bg-emerald-600 text-white shadow-sm' },
  { value: 'sell', label: 'Sell XLM', activeClass: 'bg-rose-600 text-white shadow-sm' },
];

export default function MarketPage() {
  const user = useAuthStore((s) => s.user);
  const [side, setSide] = useState('buy');
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const debouncedAmount = useDebounce(amount);

  // Buyers browse sell orders; sellers browse buy orders.
  const type = side === 'buy' ? 'SELL' : 'BUY';

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

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">P2P Market</h1>
          <p className="mt-1 text-sm text-slate-500">
            Trade XLM directly with other Nigerians. Every trade is protected by on-chain Stellar escrow.
          </p>
        </div>
        {user && (
          <Link to="/orders/new">
            <Button>
              <Plus className="h-4 w-4" /> Post an order
            </Button>
          </Link>
        )}
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-end">
          <Tabs tabs={SIDE_TABS} value={side} onChange={changeFilter(setSide)} />
          <div className="grid flex-1 grid-cols-2 gap-3 lg:ml-4 lg:max-w-md">
            <Input
              placeholder="Min. amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => changeFilter(setAmount)(e.target.value)}
              suffix="XLM"
              aria-label="Minimum XLM amount"
            />
            <Select
              aria-label="Payment method"
              value={method}
              onChange={(e) => changeFilter(setMethod)(e.target.value)}
              options={[{ value: '', label: 'All payment methods' }, ...PAYMENT_METHODS]}
            />
          </div>
          <Button variant="ghost" onClick={() => reload()} className="lg:ml-auto" aria-label="Refresh orders">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid">
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

        <Pagination pagination={data?.pagination} onChange={setPage} />
      </div>

      {selected && <TradeModal key={selected.id} order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
