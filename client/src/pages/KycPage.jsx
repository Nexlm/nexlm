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
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="page-title">Identity verification</h1>
        <p className="mt-1 text-sm text-slate-500">
          Verify with your BVN or NIN to trade. We only keep the last 4 digits of your ID number.
        </p>
      </div>

      {result && (
        <Alert tone={{ VERIFIED: 'success', PENDING: 'info', REJECTED: 'error', ERROR: 'error' }[result.status]}>
          {result.message}
        </Alert>
      )}

      {status.kycStatus === 'VERIFIED' && (
        <div className="card flex flex-col items-center p-8 text-center">
          <ShieldCheck className="h-12 w-12 text-emerald-600" />
          <p className="mt-3 text-lg font-semibold">You&apos;re verified</p>
          <p className="mt-1 text-sm text-slate-500">
            {status.kycFullName} · {status.kycIdType} ending in {status.kycIdLast4}
          </p>
          <Link to="/" className="mt-5 text-sm font-medium text-brand-700 hover:underline">
            Start trading →
          </Link>
        </div>
      )}

      {status.kycStatus === 'PENDING' && (
        <Alert tone="info" title="Under review">
          Submitted {formatDateTime(status.kycSubmittedAt)} for {status.kycIdType} ending in {status.kycIdLast4}. We&apos;ll
          update your account once it&apos;s reviewed.
        </Alert>
      )}

      {canSubmit && (
        <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
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
                    'rounded-lg border p-3 text-left',
                    form.idType === opt.value ? 'border-brand-600 bg-brand-50' : 'border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.hint}</p>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" autoComplete="given-name" value={form.firstName} onChange={update('firstName')} error={errors.firstName} />
            <Input label="Last name" autoComplete="family-name" value={form.lastName} onChange={update('lastName')} error={errors.lastName} />
          </div>
          <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} error={errors.dateOfBirth} />

          <Button type="submit" className="w-full" loading={submitting}>
            Verify identity
          </Button>
          <p className="text-center text-xs text-slate-500">
            Checked against NIBSS/NIMC records through our KYC partner. Your full ID number is never stored.
          </p>
        </form>
      )}
    </div>
  );
}
