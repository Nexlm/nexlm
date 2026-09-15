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
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="flex items-center gap-5">
        <div className="scale-150 pl-2">
          <Avatar name={profile.displayName} />
        </div>
        <div className="pl-4">
          <p className="eyebrow">Trader · joined {new Date(profile.createdAt).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}</p>
          <h1 className="page-title mt-2 flex items-center gap-2">
            {profile.displayName}
            {profile.kycStatus === 'VERIFIED' && <BadgeCheck className="h-7 w-7 text-mint" aria-label="Verified" />}
          </h1>
        </div>
      </section>

      <dl className="stat-grid stat-cols-2 grid-cols-2">
        <div className="stat-cell">
          <dd className="stat-value">{profile.stats.completedTrades}</dd>
          <dt className="stat-label">completed trades</dt>
        </div>
        <div className="stat-cell">
          <dd className="stat-value text-mint">{formatPercent(profile.stats.completionRate)}</dd>
          <dt className="stat-label">completion rate</dt>
        </div>
      </dl>

      <section className="card overflow-hidden">
        <p className="eyebrow border-b border-line px-5 py-4">Active orders</p>
        {profile.activeOrders.length === 0 ? (
          <EmptyState title="No active orders" />
        ) : (
          <ul className="divide-y divide-line">
            {profile.activeOrders.map((order) => (
              <li key={order.id} className="grid items-center gap-3 px-5 py-4 sm:grid-cols-4">
                <Badge tone={order.type === 'SELL' ? 'ember' : 'mint'}>{order.type === 'SELL' ? 'Selling' : 'Buying'}</Badge>
                <span className="num font-semibold text-gold">{formatXlm(order.xlmAmount)}</span>
                <span className="font-display text-lg font-bold">{formatNgn(order.ngnRate)}</span>
                <PaymentMethodChips methods={order.paymentMethods} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
