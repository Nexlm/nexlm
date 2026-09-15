import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';
import { Alert } from '../ui/Feedback.jsx';

/** Nudges users through the steps required before they can trade. */
export function AccountBanners() {
  const user = useAuthStore((s) => s.user);
  const [sending, setSending] = useState(false);

  if (!user) return null;

  async function resend() {
    setSending(true);
    try {
      await api.post('/auth/resend-verification');
      toast.success(`Verification email sent to ${user.email}`);
    } catch (err) {
      toast.error(err);
    } finally {
      setSending(false);
    }
  }

  if (!user.emailVerified) {
    return (
      <Alert
        tone="warning"
        title="Verify your email address"
        className="mb-8"
        action={
          <button type="button" onClick={resend} disabled={sending} className="link text-sm disabled:opacity-50">
            {sending ? 'Sending…' : 'Resend email'}
          </button>
        }
      >
        We sent a link to {user.email}. You need a verified email to trade or withdraw.
      </Alert>
    );
  }

  if (user.kycStatus === 'UNVERIFIED' || user.kycStatus === 'REJECTED') {
    return (
      <Alert
        tone="info"
        title={user.kycStatus === 'REJECTED' ? 'Identity verification failed' : 'Verify your identity to start trading'}
        className="mb-8"
        action={
          <Link to="/kyc" className="link text-sm">
            Verify now
          </Link>
        }
      >
        A BVN or NIN check is required before you can buy or sell XLM for Naira.
      </Alert>
    );
  }

  if (user.kycStatus === 'PENDING') {
    return (
      <Alert tone="info" title="Verification under review" className="mb-8">
        We&apos;re reviewing your identity details. This usually takes less than a day.
      </Alert>
    );
  }

  return null;
}
