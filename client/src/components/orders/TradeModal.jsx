import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { PAYMENT_METHODS, paymentMethodLabel } from '../../lib/constants.js';
import { estimateNgn, formatNgn, formatXlm } from '../../lib/format.js';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';
import { TraderBadge } from '../common/TraderBadge.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Feedback.jsx';
import { Select } from '../ui/Field.jsx';
import { Modal } from '../ui/Modal.jsx';

const ERROR_LINKS = {
  KYC_REQUIRED: { to: '/kyc', label: 'Verify identity' },
  EMAIL_NOT_VERIFIED: { to: '/settings', label: 'Account settings' },
  PAYMENT_ACCOUNT_REQUIRED: { to: '/settings', label: 'Add payout account' },
  INSUFFICIENT_BALANCE: { to: '/wallet', label: 'Deposit XLM' },
};

export function TradeModal({ order, onClose }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [method, setMethod] = useState(order.paymentMethods[0]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const takerBuys = order.type === 'SELL';
  const total = estimateNgn(order.xlmAmount, order.ngnRate);
  const options = PAYMENT_METHODS.filter((m) => order.paymentMethods.includes(m.value));

  async function confirm() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent('/')}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const trade = await api.post('/trades', { orderId: order.id, paymentMethod: method });
      toast.success('Trade opened — XLM is locked in escrow.');
      navigate(`/trades/${trade.id}`);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }

  const link = error && ERROR_LINKS[error.code];

  return (
    <Modal
      open
      onClose={onClose}
      title={takerBuys ? 'Buy XLM' : 'Sell XLM'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={takerBuys ? 'success' : 'danger'} onClick={confirm} loading={loading}>
            {user ? `${takerBuys ? 'Buy' : 'Sell'} ${formatXlm(order.xlmAmount)}` : 'Log in to trade'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TraderBadge user={order.user} />

        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm">
          <div>
            <dt className="text-slate-500">Price</dt>
            <dd className="font-semibold">{formatNgn(order.ngnRate)} / XLM</dd>
          </div>
          <div>
            <dt className="text-slate-500">Amount</dt>
            <dd className="font-semibold">{formatXlm(order.xlmAmount)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">{takerBuys ? 'You pay' : 'You receive'}</dt>
            <dd className="text-xl font-semibold text-slate-900">{formatNgn(total)}</dd>
          </div>
        </dl>

        {options.length > 1 ? (
          <Select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} options={options} />
        ) : (
          <p className="text-sm text-slate-600">
            Payment method: <span className="font-medium">{paymentMethodLabel(method)}</span>
          </p>
        )}

        {order.terms && (
          <div>
            <p className="label">Advertiser terms</p>
            <p className="whitespace-pre-line rounded-lg border border-slate-200 p-3 text-sm text-slate-600">{order.terms}</p>
          </div>
        )}

        <div className="flex gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
          <p>
            {takerBuys
              ? "The seller's XLM is locked in a Stellar escrow account before you pay. It's released to you once the seller confirms your Naira payment."
              : "Your XLM will be locked in a Stellar escrow account. Only release it after the buyer's Naira is in your account."}
          </p>
        </div>

        {error && (
          <Alert
            tone="error"
            action={
              link && (
                <Link to={link.to} className="text-sm font-medium underline">
                  {link.label}
                </Link>
              )
            }
          >
            {error.message}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
