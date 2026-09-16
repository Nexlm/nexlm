import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tradeCountLabel } from '../components/common/TraderBadge.jsx';
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
import { usePageTitle } from '../hooks/usePageTitle.js';

function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <dt className="table-head">{label}</dt>
      <dd className="text-sm text-paper">{children}</dd>
    </div>
  );
}

export default function SettingsPage() {
  usePageTitle('Settings');
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
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="page-title mt-3">Settings</h1>
      </div>

      <section className="card p-6">
        <dl className="border-t border-line">
          <InfoRow label="Display name">{user.displayName}</InfoRow>
          <InfoRow label="Email">
            <span className="flex items-center gap-2">
              {user.email}
              {user.emailVerified ? <Badge tone="mint">Verified</Badge> : <Badge tone="gold">Unverified</Badge>}
            </span>
          </InfoRow>
          <InfoRow label="Identity">
            <span className="flex items-center gap-2">
              <StatusBadge map={KYC_STATUS} status={user.kycStatus} />
              {user.kycStatus !== 'VERIFIED' && (
                <Link to="/kyc" className="link text-xs">
                  Verify
                </Link>
              )}
            </span>
          </InfoRow>
          {user.stats && (
            <InfoRow label="Reputation">
              {tradeCountLabel(user.stats.completedTrades)} · {formatPercent(user.stats.completionRate)} completion
            </InfoRow>
          )}
          <InfoRow label="Stellar wallet">
            <span className="flex items-center gap-1">
              <span className="mono break-all">{user.stellarPublicKey}</span>
              <CopyButton value={user.stellarPublicKey} label="" />
            </span>
          </InfoRow>
          <InfoRow label="Member since">
            <span className="num">{formatDateTime(user.createdAt)}</span>
          </InfoRow>
        </dl>

        <form onSubmit={savePhone} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
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
