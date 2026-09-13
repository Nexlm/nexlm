import clsx from 'clsx';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, History } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { formatDateTime, formatXlm, shortAddress } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { EmptyState, ErrorState, Spinner } from '../ui/Feedback.jsx';

const KIND_LABELS = {
  payment: { in: 'Received', out: 'Sent' },
  create_account: { in: 'Account funded', out: 'Funded account' },
  account_merge: { in: 'Escrow returned', out: 'Account merged' },
};

export function ActivityList({ refreshKey }) {
  const [extra, setExtra] = useState({ items: [], nextCursor: undefined });
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, loading, error, reload } = useApi(async () => {
    const res = await api.get('/wallet/activity');
    setExtra({ items: [], nextCursor: undefined });
    return res;
  }, [refreshKey]);

  const items = [...(data?.items ?? []), ...extra.items];
  const nextCursor = extra.nextCursor === undefined ? data?.nextCursor : extra.nextCursor;

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await api.get('/wallet/activity', { cursor: nextCursor });
      setExtra((prev) => ({ items: [...prev.items, ...res.items], nextCursor: res.nextCursor }));
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (items.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Deposits, trades and withdrawals will show up here." />;
  }

  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const incoming = item.direction === 'in';
          const Icon = incoming ? ArrowDownLeft : ArrowUpRight;
          return (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className={clsx('rounded-full p-2', incoming ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600')}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{KIND_LABELS[item.kind]?.[item.direction] ?? item.kind}</p>
                <p className="mono truncate text-slate-500">
                  {incoming ? 'from' : 'to'} {shortAddress(item.counterparty, 6)} · {formatDateTime(item.createdAt)}
                </p>
              </div>
              <div className="text-right">
                {item.amount && (
                  <p className={clsx('text-sm font-semibold', incoming ? 'text-emerald-600' : 'text-slate-900')}>
                    {incoming ? '+' : '−'}
                    {formatXlm(item.amount)}
                  </p>
                )}
                <a
                  href={item.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
                >
                  Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
      {nextCursor && (
        <div className="pt-3 text-center">
          <Button variant="secondary" size="sm" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
