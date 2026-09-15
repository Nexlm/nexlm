import clsx from 'clsx';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Alert, ErrorState, PageLoader } from '../components/ui/Feedback.jsx';
import { Input } from '../components/ui/Field.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { fieldErrors } from '../lib/forms.js';
import { formatDateTime } from '../lib/format.js';
import { useAuthStore } from '../store/authStore.js';

const EMPTY = { idType: 'BVN', idNumber: '', firstName: '', lastName: '', dateOfBirth: '' };

export default function KycPage() {
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const { data: status, loading, error, reload } = useApi(() => api.get('/kyc'), []);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setResult(null);
    try {
      const res = await api.post('/kyc', form);
      setResult(res);
      await Promise.all([reload({ silent: true }), refreshUser()]);
    } catch (err) {
      const mapped = fieldErrors(err);
      setErrors(mapped);
      if (!Object.keys(mapped).length) setResult({ status: 'ERROR', message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !status) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const canSubmit = status.kycStatus === 'UNVERIFIED' || status.kycStatus === 'REJECTED';

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <p className="eyebrow">Identity</p>
        <h1 className="page-title mt-3">Verify with BVN or NIN</h1>
        <p className="mt-2 text-soft">Required to trade Naira. We only keep the last 4 digits of your ID number.</p>
      </div>

      {result && (
        <Alert tone={{ VERIFIED: 'success', PENDING: 'info', REJECTED: 'error', ERROR: 'error' }[result.status]}>{result.message}</Alert>
      )}

      {status.kycStatus === 'VERIFIED' && (
        <div className="card flex flex-col items-center p-10 text-center">
          <ShieldCheck className="h-12 w-12 text-mint" />
          <p className="mt-4 font-display text-2xl font-extrabold">You&apos;re verified</p>
          <p className="mt-1 font-mono text-xs text-moss">
            {status.kycFullName} · {status.kycIdType} ···{status.kycIdLast4}
          </p>
          <Link to="/" className="link mt-6 text-sm">
            Start trading →
          </Link>
        </div>
      )}

      {status.kycStatus === 'PENDING' && (
        <Alert tone="info" title="Under review">
          Submitted {formatDateTime(status.kycSubmittedAt)} for {status.kycIdType} ending in {status.kycIdLast4}.
        </Alert>
      )}

      {canSubmit && (
        <form onSubmit={submit} className="card space-y-5 p-6" noValidate>
          {status.kycStatus === 'REJECTED' && !result && (
            <Alert tone="error">Your last attempt didn&apos;t match. Enter your details exactly as they appear on your ID.</Alert>
          )}

          <fieldset>
            <legend className="label">ID type</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'BVN', label: 'BVN', hint: 'Bank Verification Number' },
                { value: 'NIN', label: 'NIN', hint: 'National Identity Number' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={form.idType === opt.value}
                  onClick={() => setForm((f) => ({ ...f, idType: opt.value }))}
                  className={clsx(
                    'rounded border p-4 text-left transition-colors',
                    form.idType === opt.value ? 'border-mint bg-mint/[0.07]' : 'border-line hover:border-moss',
                  )}
                >
                  <p className="font-display text-lg font-bold">{opt.label}</p>
                  <p className="text-xs text-moss">{opt.hint}</p>
                </button>
              ))}
            </div>
          </fieldset>

          <Input
            label={`${form.idType} number`}
            inputMode="numeric"
            maxLength={11}
            placeholder="11 digits"
            value={form.idNumber}
            onChange={update('idNumber')}
            error={errors.idNumber}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="First name" autoComplete="given-name" value={form.firstName} onChange={update('firstName')} error={errors.firstName} />
            <Input label="Last name" autoComplete="family-name" value={form.lastName} onChange={update('lastName')} error={errors.lastName} />
          </div>
          <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} error={errors.dateOfBirth} />

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Verify identity
          </Button>
          <p className="text-center text-xs text-moss">Checked against NIBSS/NIMC records. Your full ID number is never stored.</p>
        </form>
      )}
    </div>
  );
}
