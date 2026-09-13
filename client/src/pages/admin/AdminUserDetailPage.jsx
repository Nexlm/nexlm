import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{children}</dd>
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

  const setStatus = (status) =>
    run(status, () => api.patch(`/admin/users/${id}/status`, { status }), `Account set to ${status.toLowerCase()}`);
  const decideKyc = (decision) =>
    run(decision, () => api.post(`/admin/kyc/${id}`, { decision }), decision === 'APPROVE' ? 'KYC approved' : 'KYC rejected');

  if (loading && !user) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> All users
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{user.displayName}</h2>
            <StatusBadge map={USER_STATUS} status={user.status} />
          </div>
          <dl className="divide-y divide-slate-100">
            <Row label="Email">
              {user.email} {user.emailVerified ? '✓' : '(unverified)'}
            </Row>
            <Row label="Phone">{user.phone ?? '—'}</Row>
            <Row label="Role">{user.role}</Row>
            <Row label="Completed trades">{user.stats.completedTrades}</Row>
            <Row label="Completion rate">{formatPercent(user.stats.completionRate)}</Row>
            <Row label="Stellar">
              <span className="mono break-all">{user.stellarPublicKey}</span>
            </Row>
            <Row label="Joined">{formatDateTime(user.createdAt)}</Row>
          </dl>
          {user.role !== 'ADMIN' && (
            <div className="mt-4 flex flex-wrap gap-2">
              {user.status !== 'ACTIVE' && (
                <Button size="sm" variant="success" loading={busy === 'ACTIVE'} onClick={() => setStatus('ACTIVE')}>
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Identity</h2>
            <StatusBadge map={KYC_STATUS} status={user.kycStatus} />
          </div>
          {user.kycSubmittedAt ? (
            <dl className="divide-y divide-slate-100">
              <Row label="Name on submission">{user.kycFullName}</Row>
              <Row label="ID">
                {user.kycIdType} ···{user.kycIdLast4}
              </Row>
              <Row label="Provider reference">{user.kycReference ?? 'Manual review'}</Row>
              <Row label="Submitted">{formatDateTime(user.kycSubmittedAt)}</Row>
              {user.kycReviewedAt && <Row label="Reviewed">{formatDateTime(user.kycReviewedAt)}</Row>}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No identity details submitted.</p>
          )}
          {user.kycStatus === 'PENDING' && (
            <>
              <Alert tone="warning" className="mt-4">
                Confirm the name matches the payout account names below before approving.
              </Alert>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="success" loading={busy === 'APPROVE'} onClick={() => decideKyc('APPROVE')}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" loading={busy === 'REJECT'} onClick={() => decideKyc('REJECT')}>
                  Reject
                </Button>
              </div>
            </>
          )}

          <h3 className="mt-6 text-sm font-semibold">Payout accounts</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {user.paymentAccounts.length === 0 && <li>None</li>}
            {user.paymentAccounts.map((a) => (
              <li key={a.id}>
                {paymentMethodLabel(a.method)} {a.bankName && `(${a.bankName})`} — {a.accountName} ·{' '}
                <span className="mono">{a.accountNumber}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card overflow-hidden">
        <h2 className="border-b border-slate-100 px-6 py-4 text-base font-semibold">Recent trades</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {user.recentTrades.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link to={`/admin/trades/${t.id}`} className="font-medium text-brand-700 hover:underline">
                      {t.buyerId === user.id ? 'Bought' : 'Sold'} {formatXlm(t.xlmAmount)}
                    </Link>
                  </td>
                  <td className="px-6 py-3">{formatNgn(t.ngnAmount)}</td>
                  <td className="px-6 py-3">
                    with {t.buyerId === user.id ? t.seller.displayName : t.buyer.displayName}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge map={TRADE_STATUS} status={t.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-slate-500">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {user.recentTrades.length === 0 && <p className="px-6 py-4 text-sm text-slate-500">No trades yet.</p>}
        </div>
      </section>
    </div>
  );
}
