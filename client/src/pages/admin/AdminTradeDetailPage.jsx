import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TraderBadge } from '../../components/common/TraderBadge.jsx';
import { TradeChat } from '../../components/trade/TradeChat.jsx';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import { ErrorState, PageLoader } from '../../components/ui/Feedback.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useLiveRefresh, useSocket, useSocketEvent } from '../../hooks/useSocket.js';
import { api } from '../../lib/api.js';
import { CANCEL_REASONS, paymentMethodLabel, TRADE_STATUS } from '../../lib/constants.js';
import { formatDateTime, formatNgn, formatXlm } from '../../lib/format.js';
import { useAuthStore } from '../../store/authStore.js';

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-3 text-sm">
      <dt className="table-head pt-0.5">{label}</dt>
      <dd className="text-right text-paper">{children}</dd>
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
  useLiveRefresh(() => reload({ silent: true }), 6000);

  if (loading && !trade) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const links = [
    ['Lock', trade.links.escrow],
    ['Release', trade.links.release],
    ['Refund', trade.links.refund],
  ].filter(([, href]) => href);

  return (
    <div className="space-y-8">
      <Link to="/admin/trades" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-moss hover:text-paper">
        <ArrowLeft className="h-3.5 w-3.5" /> All trades
      </Link>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="num text-3xl font-semibold text-gold">{formatXlm(trade.xlmAmount)}</h2>
              <StatusBadge map={TRADE_STATUS} status={trade.status} />
            </div>
            <dl className="border-t border-line">
              <Row label="Trade ID">
                <span className="mono">{trade.id}</span>
              </Row>
              <Row label="Total">
                <span className="font-display font-bold">{formatNgn(trade.ngnAmount)}</span>
              </Row>
              <Row label="Rate">{formatNgn(trade.ngnRate)} / XLM</Row>
              <Row label="Method">{paymentMethodLabel(trade.paymentMethod)}</Row>
              <Row label="Opened">
                <span className="num">{formatDateTime(trade.createdAt)}</span>
              </Row>
              <Row label="Deadline">
                <span className="num">{formatDateTime(trade.paymentDeadline)}</span>
              </Row>
              {trade.paidAt && (
                <Row label="Marked paid">
                  <span className="num">{formatDateTime(trade.paidAt)}</span>
                </Row>
              )}
              {trade.completedAt && (
                <Row label="Completed">
                  <span className="num">{formatDateTime(trade.completedAt)}</span>
                </Row>
              )}
              {trade.cancelledAt && (
                <Row label="Cancelled">
                  <span className="num">{formatDateTime(trade.cancelledAt)}</span> · {CANCEL_REASONS[trade.cancelReason] ?? trade.cancelReason}
                </Row>
              )}
              {trade.escrowPublicKey && (
                <Row label="Escrow">
                  <span className="mono break-all">{trade.escrowPublicKey}</span>
                </Row>
              )}
            </dl>
            {links.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-4">
                {links.map(([label, href]) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-mint hover:text-gold">
                    {label} tx <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <p className="eyebrow mb-3">Buyer</p>
              <TraderBadge user={trade.buyer} showStats={false} />
              <Link to={`/admin/users/${trade.buyerId}`} className="link mt-3 block text-xs">
                Open user →
              </Link>
            </div>
            <div className="card p-5">
              <p className="eyebrow mb-3">Seller</p>
              <TraderBadge user={trade.seller} showStats={false} />
              {trade.paymentAccount && (
                <p className="mt-3 text-xs text-moss">
                  Pays into {trade.paymentAccount.accountName} · <span className="num">{trade.paymentAccount.accountNumber}</span>
                </p>
              )}
              <Link to={`/admin/users/${trade.sellerId}`} className="link mt-3 block text-xs">
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
