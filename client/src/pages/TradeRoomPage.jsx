import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TraderBadge } from '../components/common/TraderBadge.jsx';
import { PaymentDetails } from '../components/trade/PaymentDetails.jsx';
import { TradeChat } from '../components/trade/TradeChat.jsx';
import { TradeGuide } from '../components/trade/TradeGuide.jsx';
import { TradeTimer } from '../components/trade/TradeTimer.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ErrorState, PageLoader } from '../components/ui/Feedback.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useApi } from '../hooks/useApi.js';
import { useSocket, useSocketEvent } from '../hooks/useSocket.js';
import { api } from '../lib/api.js';
import { paymentMethodLabel, TRADE_STATUS } from '../lib/constants.js';
import { formatDateTime, formatNgn, formatXlm } from '../lib/format.js';
import { useAuthStore } from '../store/authStore.js';
import { toast } from '../store/toastStore.js';

const ACTION_PATHS = { MARK_PAID: 'paid', RELEASE: 'release', CANCEL: 'cancel' };

export default function TradeRoomPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const socket = useSocket();
  const { data: trade, loading, error, reload, setData } = useApi(() => api.get(`/trades/${id}`), [id]);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(false);

  useEffect(() => {
    if (!socket) return undefined;
    const join = () => socket.emit('trade:join', id);
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('trade:leave', id);
    };
  }, [socket, id]);

  useSocketEvent('trade:updated', (payload) => {
    if (payload.id === id) reload({ silent: true });
  });

  async function runAction(action) {
    setBusy(true);
    try {
      const updated = await api.post(`/trades/${id}/${ACTION_PATHS[action]}`);
      setData(updated);
      toast.success(
        {
          MARK_PAID: 'Marked as paid. The seller has been notified.',
          RELEASE: 'XLM released to the buyer.',
          CANCEL: 'Trade cancelled. Escrow returned to the seller.',
        }[action],
      );
    } catch (err) {
      toast.error(err);
      reload({ silent: true });
    } finally {
      setBusy(false);
      setConfirming(null);
      setReceived(false);
    }
  }

  if (loading && !trade) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const isBuyer = trade.role === 'BUYER';
  const counterparty = isBuyer ? trade.seller : trade.buyer;
  const can = (action) => trade.actions.includes(action);
  const onChainLinks = [
    ['Escrow locked', trade.links.escrow],
    ['Released to buyer', trade.links.release],
    ['Refunded to seller', trade.links.refund],
  ].filter(([, href]) => href);

  return (
    <div className="space-y-6">
      <Link to="/trades" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> My trades
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">
            {isBuyer ? 'Buy' : 'Sell'} {formatXlm(trade.xlmAmount)}
          </h1>
          <p className="text-xs text-slate-500">
            Trade {trade.id} · opened {formatDateTime(trade.createdAt)}
          </p>
        </div>
        <StatusBadge map={TRADE_STATUS} status={trade.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <TradeGuide trade={trade} />

          {trade.status === 'ESCROW_LOCKED' && <TradeTimer deadline={trade.paymentDeadline} />}

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <TraderBadge user={counterparty} showStats={false} />
              <span className="text-xs text-slate-500">{isBuyer ? 'Seller' : 'Buyer'}</span>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-semibold">{formatXlm(trade.xlmAmount)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Price</dt>
                <dd className="font-semibold">{formatNgn(trade.ngnRate)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total</dt>
                <dd className="font-semibold">{formatNgn(trade.ngnAmount)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Method</dt>
                <dd className="font-semibold">{paymentMethodLabel(trade.paymentMethod)}</dd>
              </div>
            </dl>
            {trade.order?.terms && (
              <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-medium">Terms: </span>
                {trade.order.terms}
              </p>
            )}
          </section>

          {['ESCROW_LOCKED', 'PAID'].includes(trade.status) && (
            <section className="card p-5">
              <PaymentDetails account={trade.paymentAccount} amount={trade.ngnAmount} isBuyer={isBuyer} />
            </section>
          )}

          {trade.actions.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {can('MARK_PAID') && (
                <Button variant="success" size="lg" onClick={() => setConfirming('MARK_PAID')}>
                  I have paid
                </Button>
              )}
              {can('RELEASE') && (
                <Button variant="success" size="lg" onClick={() => setConfirming('RELEASE')}>
                  Release XLM
                </Button>
              )}
              {can('CANCEL') && (
                <Button variant="secondary" size="lg" onClick={() => setConfirming('CANCEL')}>
                  Cancel trade
                </Button>
              )}
            </div>
          )}

          {onChainLinks.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">On-chain record</h2>
              <ul className="space-y-1.5 text-sm">
                {onChainLinks.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                      {label} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
              {trade.escrowPublicKey && (
                <p className="mono mt-3 break-all text-slate-500">Escrow account: {trade.escrowPublicKey}</p>
              )}
            </section>
          )}
        </div>

        <div className="lg:col-span-2">
          <TradeChat tradeId={trade.id} currentUserId={user?.id} />
        </div>
      </div>

      <Modal
        open={confirming === 'MARK_PAID'}
        onClose={() => setConfirming(null)}
        title="Confirm payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Not yet
            </Button>
            <Button variant="success" loading={busy} onClick={() => runAction('MARK_PAID')}>
              Yes, I&apos;ve paid
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Confirm you have transferred <strong>{formatNgn(trade.ngnAmount)}</strong> to{' '}
          <strong>{trade.paymentAccount?.accountName}</strong>. Marking a trade as paid without paying will get your account
          suspended.
        </p>
      </Modal>

      <Modal
        open={confirming === 'RELEASE'}
        onClose={() => setConfirming(null)}
        title="Release XLM to the buyer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button variant="success" loading={busy} disabled={!received} onClick={() => runAction('RELEASE')}>
              Release {formatXlm(trade.xlmAmount)}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>Releasing is final — Stellar transactions cannot be reversed.</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={received} onChange={(e) => setReceived(e.target.checked)} className="mt-0.5" />
            <span>
              I have checked my account and received <strong>{formatNgn(trade.ngnAmount)}</strong> from the buyer.
            </span>
          </label>
        </div>
      </Modal>

      <Modal
        open={confirming === 'CANCEL'}
        onClose={() => setConfirming(null)}
        title="Cancel this trade?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Keep trade
            </Button>
            <Button variant="danger" loading={busy} onClick={() => runAction('CANCEL')}>
              Cancel trade
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          The escrowed XLM goes back to the seller. <strong>If you have already sent money, do not cancel</strong> — mark the
          trade as paid instead.
        </p>
      </Modal>
    </div>
  );
}
