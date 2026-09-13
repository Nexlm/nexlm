import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback.jsx';
import { Select } from '../../components/ui/Field.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useSocketEvent } from '../../hooks/useSocket.js';
import { api } from '../../lib/api.js';
import { paymentMethodLabel, TRADE_STATUS } from '../../lib/constants.js';
import { formatNgn, formatXlm, timeAgo } from '../../lib/format.js';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.entries(TRADE_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
];

export default function AdminTradesPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => api.get('/admin/trades', { status, page }), [status, page]);

  useSocketEvent('trade:updated', () => reload({ silent: true }));

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-4">
        <p className="text-sm text-slate-500">Most recently updated first</p>
        <Select
          aria-label="Trade status"
          className="w-56"
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
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Trade</th>
                <th className="px-4 py-3">Buyer → Seller</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/trades/${t.id}`} className="font-medium text-brand-700 hover:underline">
                      {formatXlm(t.xlmAmount)}
                    </Link>
                    <p className="mono text-slate-400">{t.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    {t.buyer.displayName} → {t.seller.displayName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatNgn(t.ngnAmount)}
                    <p className="text-xs text-slate-500">{paymentMethodLabel(t.paymentMethod)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge map={TRADE_STATUS} status={t.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{timeAgo(t.updatedAt)}</td>
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
