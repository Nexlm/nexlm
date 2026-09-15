import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tradeCountLabel } from '../../components/common/TraderBadge.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert, ErrorState, PageLoader } from '../../components/ui/Feedback.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { KYC_STATUS, paymentMethodLabel, TRADE_STATUS, USER_STATUS } from '../../lib/constants.js';
import { formatDateTime, formatNgn, formatPercent, formatXlm } from '../../lib/format.js';
import { toast } from '../../store/toastStore.js';

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-3 text-sm">
      <dt className="table-head pt-0.5">{label}</dt>
      <dd className="text-right text-paper">{children}</dd>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const { data: user, loading, error, reload, setData } = useApi(() => api.get(`/admin/users/${id}`), [id]);
  const [busy, setBusy] = useState(null);

  async function run(key, fn, message) {
    setBusy(key);
    try {
      const updated = await fn();
      setData((current) => ({ ...current, ...updated }));
      toast.success(message);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (status) => run(status, () => api.patch(`/admin/users/${id}/status`, { status }), `Account set to ${status.toLowerCase()}`);
  const decideKyc = (decision) =>
    run(decision, () => api.post(`/admin/kyc/${id}`, { decision }), decision === 'APPROVE' ? 'KYC approved' : 'KYC rejected');

  if (loading && !user) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-8">
      <Link to="/admin/users" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-moss hover:text-paper">
        <ArrowLeft className="h-3.5 w-3.5" /> All users
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold">{user.displayName}</h2>
            <StatusBadge map={USER_STATUS} status={user.status} />
          </div>
          <dl className="border-t border-line">
            <Row label="Email">
              {user.email} {user.emailVerified ? <span className="text-mint">✓</span> : <span className="text-gold">(unverified)</span>}
            </Row>
            <Row label="Phone">{user.phone ?? '—'}</Row>
            <Row label="Role">{user.role}</Row>
            <Row label="Reputation">
              {tradeCountLabel(user.stats.completedTrades)} · {formatPercent(user.stats.completionRate)}
            </Row>
            <Row label="Stellar">
              <span className="mono break-all">{user.stellarPublicKey}</span>
            </Row>
            <Row label="Joined">
              <span className="num">{formatDateTime(user.createdAt)}</span>
            </Row>
          </dl>
          {user.role !== 'ADMIN' && (
            <div className="mt-5 flex flex-wrap gap-2">
              {user.status !== 'ACTIVE' && (
                <Button size="sm" loading={busy === 'ACTIVE'} onClick={() => setStatus('ACTIVE')}>
                  Reactivate
                </Button>
              )}
              {user.status !== 'SUSPENDED' && (
                <Button size="sm" variant="secondary" loading={busy === 'SUSPENDED'} onClick={() => setStatus('SUSPENDED')}>
                  Suspend
                </Button>
              )}
              {user.status !== 'BANNED' && (
                <Button size="sm" variant="danger" loading={busy === 'BANNED'} onClick={() => setStatus('BANNED')}>
                  Ban
                </Button>
              )}
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold">Identity</h2>
            <StatusBadge map={KYC_STATUS} status={user.kycStatus} />
          </div>
          {user.kycSubmittedAt ? (
            <dl className="border-t border-line">
              <Row label="Name">{user.kycFullName}</Row>
              <Row label="ID">
                <span className="num">
                  {user.kycIdType} ···{user.kycIdLast4}
                </span>
              </Row>
              <Row label="Reference">{user.kycReference ?? 'Manual review'}</Row>
              <Row label="Submitted">
                <span className="num">{formatDateTime(user.kycSubmittedAt)}</span>
              </Row>
              {user.kycReviewedAt && (
                <Row label="Reviewed">
                  <span className="num">{formatDateTime(user.kycReviewedAt)}</span>
                </Row>
              )}
            </dl>
          ) : (
            <p className="text-sm text-moss">No identity details submitted.</p>
          )}
          {user.kycStatus === 'PENDING' && (
            <>
              <Alert tone="warning" className="mt-5">
                Confirm the name matches the payout account names below before approving.
              </Alert>
              <div className="mt-4 flex gap-2">
                <Button size="sm" loading={busy === 'APPROVE'} onClick={() => decideKyc('APPROVE')}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" loading={busy === 'REJECT'} onClick={() => decideKyc('REJECT')}>
                  Reject
                </Button>
              </div>
            </>
          )}

          <p className="eyebrow mt-8">Payout accounts</p>
          <ul className="mt-3 border-t border-line text-sm">
            {user.paymentAccounts.length === 0 && <li className="py-3 text-moss">None</li>}
            {user.paymentAccounts.map((a) => (
              <li key={a.id} className="border-b border-line py-3 text-soft">
                <span className="font-semibold text-paper">{paymentMethodLabel(a.method)}</span> {a.bankName && `(${a.bankName})`} — {a.accountName} ·{' '}
                <span className="num">{a.accountNumber}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card overflow-hidden">
        <p className="eyebrow border-b border-line px-5 py-4">Recent trades</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-line">
              {user.recentTrades.map((t) => (
                <tr key={t.id} className="hover:bg-raised/50">
                  <td className="px-5 py-3.5">
                    <Link to={`/admin/trades/${t.id}`} className="font-semibold text-paper hover:text-mint">
                      {t.buyerId === user.id ? 'Bought' : 'Sold'} <span className="num text-gold">{formatXlm(t.xlmAmount)}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 font-display font-bold">{formatNgn(t.ngnAmount)}</td>
                  <td className="px-5 py-3.5 text-soft">with {t.buyerId === user.id ? t.seller.displayName : t.buyer.displayName}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge map={TRADE_STATUS} status={t.status} />
                  </td>
                  <td className="num whitespace-nowrap px-5 py-3.5 text-xs text-moss">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {user.recentTrades.length === 0 && <p className="px-5 py-4 text-sm text-moss">No trades yet.</p>}
        </div>
      </section>
    </div>
  );
}
