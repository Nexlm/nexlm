import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback.jsx';
import { Select } from '../../components/ui/Field.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { api } from '../../lib/api.js';
import { KYC_STATUS, USER_STATUS } from '../../lib/constants.js';
import { formatDateTime } from '../../lib/format.js';

const toOptions = (map, allLabel) => [
  { value: '', label: allLabel },
  ...Object.entries(map).map(([value, meta]) => ({ value, label: meta.label })),
];

export default function AdminUsersPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const debouncedQ = useDebounce(q);
  const status = params.get('status') ?? '';
  const kycStatus = params.get('kycStatus') ?? '';
  const page = Number(params.get('page') ?? 1);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const { data, loading, error, reload } = useApi(
    () => api.get('/admin/users', { q: debouncedQ, status, kycStatus, page }),
    [debouncedQ, status, kycStatus, page],
  );

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className="field pl-9"
            placeholder="Email, name or Stellar address"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <Select aria-label="Account status" value={status} onChange={(e) => setParam('status', e.target.value)} options={toOptions(USER_STATUS, 'All statuses')} />
        <Select aria-label="KYC status" value={kycStatus} onChange={(e) => setParam('kycStatus', e.target.value)} options={toOptions(KYC_STATUS, 'All KYC states')} />
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : error ? (
        <div className="p-4">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title="No users match these filters" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">KYC</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/users/${u.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {u.displayName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {u.email}
                      {u.role === 'ADMIN' && ' · admin'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge map={KYC_STATUS} status={u.kycStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge map={USER_STATUS} status={u.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination pagination={data?.pagination} onChange={(p) => setParam('page', String(p))} />
    </div>
  );
}
