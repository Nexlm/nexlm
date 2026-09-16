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
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useLiveRefresh, useSocket, useSocketEvent } from '../hooks/useSocket.js';
import { api } from '../lib/api.js';
import { paymentMethodLabel, TRADE_STATUS } from '../lib/constants.js';
import { formatDateTime, formatNgn, formatXlm, shortAddress } from '../lib/format.js';
import { useAuthStore } from '../store/authStore.js';
import { toast } from '../store/toastStore.js';

const ACTION_PATHS = { MARK_PAID: 'paid', RELEASE: 'release', CANCEL: 'cancel' };

function Fact({ label, children, className }) {
  return (
    <div className={`border-b border-line py-4 ${className ?? ''}`}>
      <dt className="table-head">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

export default function TradeRoomPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const socket = useSocket();
  const { data: trade, loading, error, reload, setData } = useApi(() => api.get(`/trades/${id}`), [id]);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(false);

  usePageTitle(trade ? `${trade.role === 'BUYER' ? 'Buying' : 'Selling'} ${trade.xlmAmount} XLM` : 'Trade');

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
  useLiveRefresh(() => reload({ silent: true }), 4000);

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
    ['Lock', trade.links.escrow, 'text-gold'],
    ['Release', trade.links.release, 'text-mint'],
    ['Refund', trade.links.refund, 'text-frost'],
  ].filter(([, href]) => href);

  return (
    <div className="space-y-8">
      <Link to="/trades" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-moss hover:text-paper">
        <ArrowLeft className="h-3.5 w-3.5" /> My trades
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">
            {isBuyer ? 'Buying from' : 'Selling to'} {counterparty.displayName}
          </p>
          <h1 className="page-title mt-3">
            {isBuyer ? 'Buy' : 'Sell'} <span className="text-gold">{formatXlm(trade.xlmAmount)}</span>
          </h1>
          <p className="mt-2 font-mono text-[11px] text-moss">
            {trade.id} · opened {formatDateTime(trade.createdAt)}
          </p>
        </div>
        <StatusBadge map={TRADE_STATUS} status={trade.status} />
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <TradeGuide trade={trade} />

          {trade.status === 'ESCROW_LOCKED' && <TradeTimer deadline={trade.paymentDeadline} />}

          <section className="card p-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <TraderBadge user={counterparty} showStats={false} />
              <span className="table-head">{isBuyer ? 'Seller' : 'Buyer'}</span>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4">
              <Fact label="Amount">
                <span className="num font-semibold text-gold">{formatXlm(trade.xlmAmount)}</span>
              </Fact>
              <Fact label="Price" className="sm:pl-4">
                <span className="font-display text-lg font-bold">{formatNgn(trade.ngnRate)}</span>
              </Fact>
              <Fact label="Total" className="sm:pl-4">
                <span className="font-display text-lg font-bold">{formatNgn(trade.ngnAmount)}</span>
              </Fact>
              <Fact label="Method" className="sm:pl-4">
                <span className="font-semibold">{paymentMethodLabel(trade.paymentMethod)}</span>
              </Fact>
            </dl>
            {trade.order?.terms && (
              <p className="mt-4 text-sm text-soft">
                <span className="table-head mr-2">Terms</span>
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
                <Button variant="gold" size="lg" onClick={() => setConfirming('RELEASE')}>
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
            <section className="card overflow-hidden">
              <p className="eyebrow border-b border-line px-5 py-4">On-chain record · Stellar</p>
              <ul>
                {onChainLinks.map(([label, href, color]) => (
                  <li key={label} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 last:border-b-0">
                    <span className={`font-mono text-[11px] font-semibold uppercase tracking-[0.12em] ${color}`}>{label}</span>
                    <a href={href} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1.5 text-sm text-paper hover:text-gold">
                      {shortAddress(href.split('/').pop(), 10)} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
              {trade.escrowPublicKey && (
                <p className="mono break-all border-t border-line px-5 py-3 text-moss">Escrow account {trade.escrowPublicKey}</p>
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
        <p className="text-sm text-soft">
          Confirm you have transferred <strong className="text-paper">{formatNgn(trade.ngnAmount)}</strong> to{' '}
          <strong className="text-paper">{trade.paymentAccount?.accountName}</strong>. Marking a trade as paid without paying gets
          accounts suspended.
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
            <Button variant="gold" loading={busy} disabled={!received} onClick={() => runAction('RELEASE')}>
              Release {formatXlm(trade.xlmAmount)}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-soft">
          <p>Releasing is final — Stellar transactions cannot be reversed.</p>
          <label className="flex items-start gap-2.5">
            <input type="checkbox" checked={received} onChange={(e) => setReceived(e.target.checked)} className="mt-0.5 accent-[#f3c44b]" />
            <span>
              I have checked my account and received <strong className="text-paper">{formatNgn(trade.ngnAmount)}</strong> from the buyer.
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
        <p className="text-sm text-soft">
          The escrowed XLM goes back to the seller. <strong className="text-paper">If you have already sent money, don&apos;t cancel</strong> —
          mark the trade as paid instead.
        </p>
      </Modal>
    </div>
  );
}
