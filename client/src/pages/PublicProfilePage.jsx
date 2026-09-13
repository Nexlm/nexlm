import { BadgeCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PaymentMethodChips } from '../components/common/PaymentMethodChips.jsx';
import { Avatar } from '../components/common/TraderBadge.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/Feedback.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatNgn, formatPercent, formatXlm } from '../lib/format.js';

export default function PublicProfilePage() {
  const { displayName } = useParams();
  const { data: profile, loading, error, reload } = useApi(() => api.get(`/users/${displayName}`), [displayName]);

  if (loading && !profile) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="scale-150 p-2">
            <Avatar name={profile.displayName} />
          </div>
          <div>
            <h1 className="flex items-center gap-1.5 text-xl font-semibold">
              {profile.displayName}
              {profile.kycStatus === 'VERIFIED' && <BadgeCheck className="h-5 w-5 text-brand-600" aria-label="Verified" />}
            </h1>
            <p className="text-sm text-slate-500">
              Joined {new Date(profile.createdAt).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-4 sm:text-right">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Completed trades</dt>
            <dd className="text-2xl font-semibold">{profile.stats.completedTrades}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Completion rate</dt>
            <dd className="text-2xl font-semibold">{formatPercent(profile.stats.completionRate)}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="border-b border-slate-100 px-6 py-4 text-base font-semibold">Active orders</h2>
        {profile.activeOrders.length === 0 ? (
          <EmptyState title="No active orders" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {profile.activeOrders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <Badge tone={order.type === 'SELL' ? 'red' : 'green'}>{order.type === 'SELL' ? 'Selling' : 'Buying'}</Badge>
                <span className="font-medium">{formatXlm(order.xlmAmount)}</span>
                <span>{formatNgn(order.ngnRate)} / XLM</span>
                <PaymentMethodChips methods={order.paymentMethods} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
