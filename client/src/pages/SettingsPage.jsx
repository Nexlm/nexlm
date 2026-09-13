import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChangePasswordForm } from '../components/settings/ChangePasswordForm.jsx';
import { PaymentAccounts } from '../components/settings/PaymentAccounts.jsx';
import { Badge, StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { CopyButton } from '../components/ui/CopyButton.jsx';
import { Input } from '../components/ui/Field.jsx';
import { api } from '../lib/api.js';
import { KYC_STATUS } from '../lib/constants.js';
import { fieldErrors } from '../lib/forms.js';
import { formatDateTime, formatPercent } from '../lib/format.js';
import { useAuthStore } from '../store/authStore.js';
import { toast } from '../store/toastStore.js';

function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [phoneError, setPhoneError] = useState(null);
  const [savingPhone, setSavingPhone] = useState(false);

  if (!user) return null;

  async function savePhone(e) {
    e.preventDefault();
    setSavingPhone(true);
    setPhoneError(null);
    try {
      const { user: updated } = await api.patch('/users/me', { phone });
      setUser({ ...user, ...updated });
      setPhone(updated.phone ?? '');
      toast.success('Phone number saved');
    } catch (err) {
      setPhoneError(fieldErrors(err).phone ?? err.message);
    } finally {
      setSavingPhone(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="page-title">Settings</h1>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-slate-900">Account</h2>
        <dl className="mt-2 divide-y divide-slate-100">
          <InfoRow label="Display name">{user.displayName}</InfoRow>
          <InfoRow label="Email">
            <span className="flex items-center gap-2">
              {user.email}
              {user.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}
            </span>
          </InfoRow>
          <InfoRow label="Identity (KYC)">
            <span className="flex items-center gap-2">
              <StatusBadge map={KYC_STATUS} status={user.kycStatus} />
              {user.kycStatus !== 'VERIFIED' && (
                <Link to="/kyc" className="text-xs font-medium text-brand-700 hover:underline">
                  Verify
                </Link>
              )}
            </span>
          </InfoRow>
          {user.stats && (
            <InfoRow label="Reputation">
              {user.stats.completedTrades} completed trades · {formatPercent(user.stats.completionRate)} completion
            </InfoRow>
          )}
          <InfoRow label="Stellar wallet">
            <span className="flex items-center gap-1">
              <span className="mono break-all">{user.stellarPublicKey}</span>
              <CopyButton value={user.stellarPublicKey} label="" />
            </span>
          </InfoRow>
          <InfoRow label="Member since">{formatDateTime(user.createdAt)}</InfoRow>
        </dl>

        <form onSubmit={savePhone} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            label="Phone number"
            placeholder="0803 123 4567"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={phoneError}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" loading={savingPhone} className={phoneError ? 'sm:mb-6' : ''}>
            Save phone
          </Button>
        </form>
      </section>

      <PaymentAccounts />
      <ChangePasswordForm />
    </div>
  );
}
