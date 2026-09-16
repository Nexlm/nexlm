import { ArrowLeftRight, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { TraderBadge } from '../components/common/TraderBadge.jsx';
import { Badge, StatusBadge } from '../components/ui/Badge.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useLiveRefresh, useSocketEvent } from '../hooks/useSocket.js';
import { api } from '../lib/api.js';
import { paymentMethodLabel, TRADE_STATUS } from '../lib/constants.js';
import { formatNgn, formatXlm, timeAgo } from '../lib/format.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const SCOPES = [
  { value: 'active', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

export default function TradesPage() {
  usePageTitle('My trades');
  // Scope and page live in the URL so a filtered list can be bookmarked.
  const [params, setParams] = useSearchParams();
  const scope = SCOPES.some((s) => s.value === params.get('scope')) ? params.get('scope') : 'active';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value && !(key === 'scope' && value === 'active')) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const { data, loading, error, reload } = useApi(() => api.get('/trades', { scope, page }), [scope, page]);

  useSocketEvent('trade:created', () => reload({ silent: true }));
  useSocketEvent('trade:updated', () => reload({ silent: true }));
  useLiveRefresh(() => reload({ silent: true }), 8000);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Escrow trades</p>
        <h1 className="page-title mt-3">My trades</h1>
        <p className="mt-2 text-soft">Open a trade to chat, pay, confirm or release escrow.</p>
      </div>

      <Tabs
        tabs={SCOPES}
        value={scope}
        onChange={(v) => setParam('scope', v)}
      />

      <div className="card overflow-hidden">
        {loading && !data ? (
          <PageLoader />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No trades yet"
            description="Pick an offer on the P2P market to start your first trade."
            action={
              <Link to="/" className="link text-sm">
                Browse the market →
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((trade) => {
              const buying = trade.role === 'BUYER';
              const counterparty = buying ? trade.seller : trade.buyer;
              return (
                <li key={trade.id}>
                  <Link to={`/trades/${trade.id}`} className="flex items-center gap-4 px-5 py-5 hover:bg-raised/50">
                    <div className="grid flex-1 gap-3 sm:grid-cols-4 sm:items-center">
                      <div className="flex items-center gap-2">
                        <Badge tone={buying ? 'mint' : 'ember'}>{buying ? 'Buying' : 'Selling'}</Badge>
                        <span className="font-mono text-[11px] text-moss">{timeAgo(trade.createdAt)}</span>
                      </div>
                      <div>
                        <p className="num font-semibold text-gold">{formatXlm(trade.xlmAmount)}</p>
                        <p className="text-xs text-moss">
                          {formatNgn(trade.ngnAmount)} · {paymentMethodLabel(trade.paymentMethod)}
                        </p>
                      </div>
                      <TraderBadge user={counterparty} showStats={false} />
                      <div className="sm:text-right">
                        <StatusBadge map={TRADE_STATUS} status={trade.status} />
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-moss" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination pagination={data?.pagination} onChange={(next) => setParam('page', String(next))} />
      </div>
    </div>
  );
}
