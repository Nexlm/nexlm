import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback.jsx';
import { Select } from '../../components/ui/Field.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useLiveRefresh, useSocketEvent } from '../../hooks/useSocket.js';
import { api } from '../../lib/api.js';
import { paymentMethodLabel, TRADE_STATUS } from '../../lib/constants.js';
import { formatNgn, formatXlm, timeAgo } from '../../lib/format.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...Object.entries(TRADE_STATUS).map(([value, meta]) => ({ value, label: meta.label }))];

export default function AdminTradesPage() {
  usePageTitle('Admin · trades');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => api.get('/admin/trades', { status, page }), [status, page]);

  useSocketEvent('trade:updated', () => reload({ silent: true }));
  useLiveRefresh(() => reload({ silent: true }), 8000);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-moss">Most recently updated first</p>
        <Select
          aria-label="Trade status"
          className="sm:w-60"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
        />
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : error ? (
        <div className="p-4">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title="No trades" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="table-head border-b border-line text-left">
              <tr>
                <th className="px-5 py-3 font-semibold">Trade</th>
                <th className="px-5 py-3 font-semibold">Buyer → Seller</th>
                <th className="px-5 py-3 font-semibold">Value</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((t) => (
                <tr key={t.id} className="hover:bg-raised/50">
                  <td className="px-5 py-3.5">
                    <Link to={`/admin/trades/${t.id}`} className="num font-semibold text-gold hover:underline">
                      {formatXlm(t.xlmAmount)}
                    </Link>
                    <p className="mono text-moss">{t.id}</p>
                  </td>
                  <td className="px-5 py-3.5 text-soft">
                    {t.buyer.displayName} → {t.seller.displayName}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="font-display font-bold">{formatNgn(t.ngnAmount)}</span>
                    <p className="text-xs text-moss">{paymentMethodLabel(t.paymentMethod)}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge map={TRADE_STATUS} status={t.status} />
                  </td>
                  <td className="num whitespace-nowrap px-5 py-3.5 text-xs text-moss">{timeAgo(t.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination pagination={data?.pagination} onChange={setPage} />
    </div>
  );
}
