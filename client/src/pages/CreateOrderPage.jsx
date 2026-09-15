import clsx from 'clsx';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Alert } from '../components/ui/Feedback.jsx';
import { Input, Textarea } from '../components/ui/Field.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { PAYMENT_METHODS } from '../lib/constants.js';
import { fieldErrors } from '../lib/forms.js';
import { estimateNgn, formatNgn, formatXlm } from '../lib/format.js';
import { toast } from '../store/toastStore.js';

const ESCROW_OVERHEAD = 2;

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [type, setType] = useState('SELL');
  const [form, setForm] = useState({ xlmAmount: '', ngnRate: '', paymentMethods: [], terms: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const wallet = useApi(() => api.get('/wallet'), []);
  const accounts = useApi(() => api.get('/users/me/payment-accounts').then((r) => r.items), []);
  const market = useApi(() => api.get('/orders', { type: 'SELL', pageSize: 1 }), []);
  const savedMethods = new Set((accounts.data ?? []).map((a) => a.method));
  const referenceRate = market.data?.items?.[0]?.ngnRate;

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function toggleMethod(value) {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(value) ? f.paymentMethods.filter((m) => m !== value) : [...f.paymentMethods, value],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    setLoading(true);
    try {
      await api.post('/orders', { type, ...form, terms: form.terms || undefined });
      toast.success('Your order is live on the market.');
      navigate('/orders');
    } catch (err) {
      const mapped = fieldErrors(err);
      setErrors(mapped);
      if (!Object.keys(mapped).length) setFormError(err);
    } finally {
      setLoading(false);
    }
  }

  const total = estimateNgn(form.xlmAmount, form.ngnRate);
  const isSell = type === 'SELL';

  return (
    <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={handleSubmit} className="space-y-7" noValidate>
        <div>
          <p className="eyebrow">New order</p>
          <h1 className="page-title mt-3">Post an order</h1>
          <p className="mt-2 text-soft">Orders stay on the market for 30 minutes or until matched.</p>
        </div>

        <Tabs
          tabs={[
            { value: 'SELL', label: 'I want to sell XLM', activeClass: 'bg-ember text-ink' },
            { value: 'BUY', label: 'I want to buy XLM', activeClass: 'bg-leaf text-ink' },
          ]}
          value={type}
          onChange={(v) => {
            setType(v);
            setErrors({});
          }}
        />

        {formError && <Alert tone="error">{formError.message}</Alert>}

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Amount"
            inputMode="decimal"
            placeholder="100"
            suffix="XLM"
            value={form.xlmAmount}
            onChange={update('xlmAmount')}
            error={errors.xlmAmount}
          />
          <Input
            label="Your price"
            inputMode="decimal"
            placeholder={referenceRate ? String(referenceRate) : '237.50'}
            suffix="₦/XLM"
            value={form.ngnRate}
            onChange={update('ngnRate')}
            error={errors.ngnRate}
            hint={referenceRate ? `Best ask right now: ${formatNgn(referenceRate)}` : undefined}
          />
        </div>

        <fieldset>
          <legend className="label">{isSell ? 'Payment methods you accept' : 'Payment methods you can pay with'}</legend>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => {
              const active = form.paymentMethods.includes(m.value);
              const missing = isSell && accounts.data && !savedMethods.has(m.value);
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => toggleMethod(m.value)}
                  aria-pressed={active}
                  className={clsx(
                    'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                    active ? 'border-mint bg-mint/10 text-mint' : 'border-line text-soft hover:border-moss',
                    missing && 'border-dashed',
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          {errors.paymentMethods && <p className="mt-1.5 text-xs text-ember">{errors.paymentMethods}</p>}
          {isSell && (
            <p className="mt-2 text-xs text-moss">
              Dashed methods have no payout account yet —{' '}
              <Link to="/settings" className="link">
                add one in settings
              </Link>
              .
            </p>
          )}
        </fieldset>

        <Textarea
          label="Terms (optional)"
          placeholder="e.g. Pay only from an account in your own name. No third-party payments."
          maxLength={500}
          value={form.terms}
          onChange={update('terms')}
          error={errors.terms}
        />

        <div className="flex gap-2">
          <Button type="submit" size="lg" variant={isSell ? 'danger' : 'success'} loading={loading}>
            Post {isSell ? 'sell' : 'buy'} order
          </Button>
          <Button size="lg" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>

      <aside className="lg:pt-24">
        <div className="card p-6 lg:sticky lg:top-24">
          <p className="table-head">{isSell ? 'You will receive' : 'You will pay'}</p>
          <p className="mt-2 font-display text-4xl font-extrabold tracking-tight">{formatNgn(total)}</p>
          <dl className="mt-6 border-t border-line text-sm">
            <div className="flex justify-between border-b border-line py-3">
              <dt className="text-moss">Amount</dt>
              <dd className="num text-gold">{formatXlm(form.xlmAmount || 0)}</dd>
            </div>
            <div className="flex justify-between border-b border-line py-3">
              <dt className="text-moss">Trading fee</dt>
              <dd className="num">₦0.00</dd>
            </div>
            {isSell && (
              <div className="flex justify-between border-b border-line py-3">
                <dt className="text-moss">Escrow reserve</dt>
                <dd className="num">{ESCROW_OVERHEAD} XLM · refunded</dd>
              </div>
            )}
            {isSell && wallet.data && (
              <div className="flex justify-between py-3">
                <dt className="text-moss">Withdrawable</dt>
                <dd className="num">{formatXlm(wallet.data.withdrawable)}</dd>
              </div>
            )}
          </dl>
        </div>
      </aside>
    </div>
  );
}
