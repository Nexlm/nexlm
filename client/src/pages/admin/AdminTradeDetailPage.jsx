import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TraderBadge } from '../../components/common/TraderBadge.jsx';
import { TradeChat } from '../../components/trade/TradeChat.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { ErrorState, PageLoader } from '../../components/ui/Feedback.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useSocket, useSocketEvent } from '../../hooks/useSocket.js';
import { api } from '../../lib/api.js';
import { CANCEL_REASONS, paymentMethodLabel, TRADE_STATUS } from '../../lib/constants.js';
import { formatDateTime, formatNgn, formatXlm } from '../../lib/format.js';
import { useAuthStore } from '../../store/authStore.js';

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{children}</dd>
    </div>
  );
}

export default function AdminTradeDetailPage() {
  const { id } = useParams();
  const admin = useAuthStore((s) => s.user);
  const socket = useSocket();
  const { data: trade, loading, error, reload } = useApi(() => api.get(`/admin/trades/${id}`), [id]);

  useEffect(() => {
    if (!socket) return undefined;
    socket.emit('trade:join', id);
    return () => socket.emit('trade:leave', id);
  }, [socket, id]);

  useSocketEvent('trade:updated', (p) => p.id === id && reload({ silent: true }));

  if (loading && !trade) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const links = [
    ['Escrow lock', trade.links.escrow],
    ['Release', trade.links.release],
    ['Refund', trade.links.refund],
  ].filter(([, href]) => href);

  return (
    <div className="space-y-6">
      <Link to="/admin/trades" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> All trades
      </Link>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{formatXlm(trade.xlmAmount)}</h2>
              <StatusBadge map={TRADE_STATUS} status={trade.status} />
            </div>
            <dl className="divide-y divide-slate-100">
              <Row label="Trade ID">
                <span className="mono">{trade.id}</span>
              </Row>
              <Row label="Total">{formatNgn(trade.ngnAmount)}</Row>
              <Row label="Rate">{formatNgn(trade.ngnRate)} / XLM</Row>
              <Row label="Method">{paymentMethodLabel(trade.paymentMethod)}</Row>
              <Row label="Opened">{formatDateTime(trade.createdAt)}</Row>
              <Row label="Payment deadline">{formatDateTime(trade.paymentDeadline)}</Row>
              {trade.paidAt && <Row label="Marked paid">{formatDateTime(trade.paidAt)}</Row>}
              {trade.completedAt && <Row label="Completed">{formatDateTime(trade.completedAt)}</Row>}
              {trade.cancelledAt && (
                <Row label="Cancelled">
                  {formatDateTime(trade.cancelledAt)} · {CANCEL_REASONS[trade.cancelReason] ?? trade.cancelReason}
                </Row>
              )}
              {trade.escrowPublicKey && (
                <Row label="Escrow account">
                  <span className="mono break-all">{trade.escrowPublicKey}</span>
                </Row>
              )}
            </dl>
            {links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {links.map(([label, href]) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                    {label} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Buyer</p>
              <TraderBadge user={trade.buyer} showStats={false} />
              <Link to={`/admin/users/${trade.buyerId}`} className="mt-2 block text-xs text-brand-700 hover:underline">
                Open user →
              </Link>
            </div>
            <div className="card p-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Seller</p>
              <TraderBadge user={trade.seller} showStats={false} />
              {trade.paymentAccount && (
                <p className="mt-2 text-xs text-slate-500">
                  Pays into: {trade.paymentAccount.accountName} · {trade.paymentAccount.accountNumber}
                </p>
              )}
              <Link to={`/admin/users/${trade.sellerId}`} className="mt-2 block text-xs text-brand-700 hover:underline">
                Open user →
              </Link>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2">
          <TradeChat tradeId={trade.id} currentUserId={admin?.id} readOnly />
        </div>
      </div>
    </div>
  );
}
