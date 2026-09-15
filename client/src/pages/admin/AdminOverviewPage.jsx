import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ErrorState, PageLoader } from '../../components/ui/Feedback.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { formatNgn, formatPercent, formatXlm } from '../../lib/format.js';

function Stat({ value, label, sub, to, accent }) {
  const body = (
    <>
      <p className={clsx('stat-value', accent)}>{value}</p>
      <p className="stat-label">{label}</p>
      {sub && <p className="mt-0.5 font-mono text-[11px] text-moss">{sub}</p>}
    </>
  );
  return (
    <div className="stat-cell">
      {to ? (
        <Link to={to} className="block hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data, loading, error, reload } = useApi(() => api.get('/admin/overview'), []);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-10">
      <section>
        <p className="eyebrow">Trading · last 30 days</p>
        <div className="stat-grid stat-cols-3 mt-4 sm:grid-cols-3">
          <Stat value={formatNgn(data.volume30d.ngn)} label="traded volume" sub={formatXlm(data.volume30d.xlm)} />
          <Stat value={data.trades.completed30d} label="completed trades" />
          <Stat value={formatPercent(data.trades.completionRate30d)} label="completion rate" accent="text-mint" />
          <Stat value={data.trades.active} label="trades in progress" to="/admin/trades" accent={data.trades.active ? 'text-gold' : undefined} />
          <Stat value={data.trades.cancelled30d} label="cancelled trades" />
          <Stat value={data.activeOrders} label="active orders on the market" />
        </div>
      </section>

      <section>
        <p className="eyebrow">People</p>
        <div className="stat-grid stat-cols-3 mt-4 sm:grid-cols-3">
          <Stat value={data.users.total} label="registered users" to="/admin/users" />
          <Stat value={data.users.verified} label="KYC verified" accent="text-mint" to="/admin/users?kycStatus=VERIFIED" />
          <Stat
            value={data.users.pendingKyc}
            label="pending KYC reviews"
            to="/admin/users?kycStatus=PENDING"
            accent={data.users.pendingKyc ? 'text-gold' : undefined}
          />
        </div>
      </section>
    </div>
  );
}
