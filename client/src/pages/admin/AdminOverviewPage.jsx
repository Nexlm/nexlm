import { Link } from 'react-router-dom';
import { ErrorState, PageLoader } from '../../components/ui/Feedback.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { formatNgn, formatPercent, formatXlm } from '../../lib/format.js';

function StatCard({ label, value, sub, to }) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </>
  );
  return to ? (
    <Link to={to} className="card block p-5 hover:border-brand-300">
      {body}
    </Link>
  ) : (
    <div className="card p-5">{body}</div>
  );
}

export default function AdminOverviewPage() {
  const { data, loading, error, reload } = useApi(() => api.get('/admin/overview'), []);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Volume (30d)" value={formatNgn(data.volume30d.ngn)} sub={formatXlm(data.volume30d.xlm)} />
      <StatCard label="Completed trades (30d)" value={data.trades.completed30d} sub={`${data.trades.cancelled30d} cancelled`} />
      <StatCard label="Completion rate (30d)" value={formatPercent(data.trades.completionRate30d)} />
      <StatCard label="Active trades" value={data.trades.active} to="/admin/trades" />
      <StatCard label="Users" value={data.users.total} sub={`${data.users.verified} KYC verified`} to="/admin/users" />
      <StatCard label="Pending KYC" value={data.users.pendingKyc} to="/admin/users?kycStatus=PENDING" />
      <StatCard label="Active orders" value={data.activeOrders} />
    </div>
  );
}
