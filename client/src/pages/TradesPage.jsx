import { ArrowLeftRight, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TraderBadge } from '../components/common/TraderBadge.jsx';
import { Badge, StatusBadge } from '../components/ui/Badge.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useSocketEvent } from '../hooks/useSocket.js';
import { api } from '../lib/api.js';
import { paymentMethodLabel, TRADE_STATUS } from '../lib/constants.js';
import { formatNgn, formatXlm, timeAgo } from '../lib/format.js';

const SCOPES = [
  { value: 'active', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
];

export default function TradesPage() {
  const [scope, setScope] = useState('active');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => api.get('/trades', { scope, page }), [scope, page]);

  useSocketEvent('trade:created', () => reload({ silent: true }));
  useSocketEvent('trade:updated', () => reload({ silent: true }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Trades</h1>
        <p className="mt-1 text-sm text-slate-500">Open a trade to chat, pay, confirm or release escrow.</p>
      </div>

      <Tabs
        tabs={SCOPES}
        value={scope}
        onChange={(v) => {
          setScope(v);
          setPage(1);
        }}
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
              <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
                Browse the market →
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((trade) => {
              const buying = trade.role === 'BUYER';
              const counterparty = buying ? trade.seller : trade.buyer;
              return (
                <li key={trade.id}>
                  <Link to={`/trades/${trade.id}`} className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50">
                    <div className="grid flex-1 gap-3 sm:grid-cols-4 sm:items-center">
                      <div className="flex items-center gap-2">
                        <Badge tone={buying ? 'green' : 'red'}>{buying ? 'Buying' : 'Selling'}</Badge>
                        <span className="text-xs text-slate-500">{timeAgo(trade.createdAt)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{formatXlm(trade.xlmAmount)}</p>
                        <p className="text-xs text-slate-500">
                          {formatNgn(trade.ngnAmount)} · {paymentMethodLabel(trade.paymentMethod)}
                        </p>
                      </div>
                      <TraderBadge user={counterparty} showStats={false} />
                      <div className="sm:text-right">
                        <StatusBadge map={TRADE_STATUS} status={trade.status} />
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination pagination={data?.pagination} onChange={setPage} />
      </div>
    </div>
  );
}
