import { Landmark, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { PAYMENT_METHODS, paymentMethodLabel } from '../../lib/constants.js';
import { fieldErrors } from '../../lib/forms.js';
import { toast } from '../../store/toastStore.js';
import { Button } from '../ui/Button.jsx';
import { EmptyState, Spinner } from '../ui/Feedback.jsx';
import { Input, Select } from '../ui/Field.jsx';

const EMPTY = { method: 'BANK_TRANSFER', bankName: '', accountName: '', accountNumber: '' };

export function PaymentAccounts() {
  const { data: accounts, loading, reload } = useApi(() => api.get('/users/me/payment-accounts').then((r) => r.items), []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form, bankName: form.method === 'BANK_TRANSFER' ? form.bankName : undefined };
      await api.post('/users/me/payment-accounts', payload);
      toast.success('Payout account saved');
      setForm(EMPTY);
      setAdding(false);
      reload({ silent: true });
    } catch (err) {
      const mapped = fieldErrors(err);
      setErrors(mapped);
      if (!Object.keys(mapped).length) toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    setDeleting(id);
    try {
      await api.delete(`/users/me/payment-accounts/${id}`);
      reload({ silent: true });
    } catch (err) {
      toast.error(err);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="card p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Payout accounts</p>
          <p className="mt-2 text-sm text-soft">Where buyers send your Naira when you sell XLM.</p>
        </div>
        {!adding && (
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : accounts.length === 0 && !adding ? (
        <EmptyState icon={Landmark} title="No payout accounts" description="Add a bank or mobile wallet account to post sell orders." />
      ) : (
        <ul className="border-t border-line">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 border-b border-line py-3.5">
              <div>
                <p className="text-sm font-semibold text-paper">
                  {paymentMethodLabel(a.method)}
                  {a.bankName && <span className="text-moss"> · {a.bankName}</span>}
                </p>
                <p className="text-sm text-soft">
                  {a.accountName} · <span className="num">{a.accountNumber}</span>
                </p>
              </div>
              <Button variant="ghost" size="sm" loading={deleting === a.id} onClick={() => remove(a.id)} aria-label="Remove account">
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={save} className="mt-5 grid gap-5 rounded border border-line bg-ink p-5 sm:grid-cols-2" noValidate>
          <Select label="Method" value={form.method} onChange={update('method')} options={PAYMENT_METHODS} error={errors.method} />
          {form.method === 'BANK_TRANSFER' ? (
            <Input label="Bank name" placeholder="e.g. GTBank" value={form.bankName} onChange={update('bankName')} error={errors.bankName} />
          ) : (
            <div className="hidden sm:block" />
          )}
          <Input label="Account name" value={form.accountName} onChange={update('accountName')} error={errors.accountName} />
          <Input
            label="Account number"
            inputMode="numeric"
            maxLength={10}
            value={form.accountNumber}
            onChange={update('accountNumber')}
            error={errors.accountNumber}
          />
          <p className="text-xs text-moss sm:col-span-2">The account name should match your verified identity.</p>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save account
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
