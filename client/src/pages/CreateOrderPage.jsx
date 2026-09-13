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
  const savedMethods = new Set((accounts.data ?? []).map((a) => a.method));

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function toggleMethod(value) {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(value)
        ? f.paymentMethods.filter((m) => m !== value)
        : [...f.paymentMethods, value],
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Post an order</h1>
        <p className="mt-1 text-sm text-slate-500">Orders stay on the market for 30 minutes or until matched.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6 p-6" noValidate>
        <Tabs
          tabs={[
            { value: 'SELL', label: 'I want to sell XLM', activeClass: 'bg-rose-600 text-white shadow-sm' },
            { value: 'BUY', label: 'I want to buy XLM', activeClass: 'bg-emerald-600 text-white shadow-sm' },
          ]}
          value={type}
          onChange={(v) => {
            setType(v);
            setErrors({});
          }}
        />

        {isSell && wallet.data && (
          <Alert tone="info">
            Available: <strong>{formatXlm(wallet.data.withdrawable)}</strong>. Each sell order reserves the amount plus{' '}
            {ESCROW_OVERHEAD} XLM escrow overhead (returned when the trade closes).
          </Alert>
        )}

        {formError && <Alert tone="error">{formError.message}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
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
            placeholder="520.00"
            suffix="₦/XLM"
            value={form.ngnRate}
            onChange={update('ngnRate')}
            error={errors.ngnRate}
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          <span className="text-slate-500">{isSell ? 'You will receive' : 'You will pay'}</span>
          <p className="text-2xl font-semibold text-slate-900">{formatNgn(total)}</p>
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
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                    missing && 'border-dashed',
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          {errors.paymentMethods && <p className="mt-1.5 text-xs text-rose-600">{errors.paymentMethods}</p>}
          {isSell && (
            <p className="mt-2 text-xs text-slate-500">
              Buyers pay into your saved payout accounts. Dashed methods have no account yet —{' '}
              <Link to="/settings" className="font-medium text-brand-700 hover:underline">
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

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" variant={isSell ? 'danger' : 'success'} loading={loading}>
            Post {isSell ? 'sell' : 'buy'} order
          </Button>
        </div>
      </form>
    </div>
  );
}
