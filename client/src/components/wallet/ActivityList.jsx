import clsx from 'clsx';
import { ExternalLink, History } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { formatDateTime, formatXlm, shortAddress } from '../../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { EmptyState, ErrorState, Spinner } from '../ui/Feedback.jsx';

const KIND_LABELS = {
  payment: { in: 'Received', out: 'Sent' },
  create_account: { in: 'Account funded', out: 'Escrow funded' },
  account_merge: { in: 'Escrow returned', out: 'Account merged' },
};

const KIND_TONE = {
  in: 'bg-mint/[0.12] text-mint',
  out: 'bg-gold/[0.12] text-gold',
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
    return <EmptyState icon={History} title="No activity yet" description="Deposits, escrow movements and withdrawals appear here." />;
  }

  return (
    <div>
      <ul className="border-t border-line">
        {items.map((item) => {
          const incoming = item.direction === 'in';
          return (
            <li key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-line py-3.5">
              <span className={clsx('rounded-[3px] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]', KIND_TONE[item.direction])}>
                {incoming ? 'In' : 'Out'}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-paper">{KIND_LABELS[item.kind]?.[item.direction] ?? item.kind}</p>
                <p className="mono truncate text-moss">
                  {incoming ? 'from' : 'to'} {shortAddress(item.counterparty, 6)} · {formatDateTime(item.createdAt)}
                </p>
              </div>
              <div className="text-right">
                {item.amount && (
                  <p className={clsx('num text-sm font-semibold', incoming ? 'text-mint' : 'text-paper')}>
                    {incoming ? '+' : '−'}
                    {formatXlm(item.amount)}
                  </p>
                )}
                <a
                  href={item.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-moss hover:text-gold"
                >
                  tx <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
      {nextCursor && (
        <div className="pt-4 text-center">
          <Button variant="secondary" size="sm" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
