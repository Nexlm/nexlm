import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AppLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Feedback.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { fieldErrors } from '../../lib/forms.js';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', displayName: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    if (form.password !== form.confirm) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const { confirm: _confirm, ...payload } = form;
      await register(payload);
      toast.success('Account created! Check your inbox to verify your email.');
      navigate('/wallet', { replace: true });
    } catch (err) {
      const mapped = fieldErrors(err);
      setErrors(mapped);
      if (!Object.keys(mapped).length) setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="A Stellar wallet is created for you automatically">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={errors.email} />
        <Input
          label="Display name"
          autoComplete="username"
          value={form.displayName}
          onChange={update('displayName')}
          error={errors.displayName}
          hint="Shown to other traders. Letters, numbers and underscores."
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters with a letter and a number."
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
        />
        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
        <p className="text-center text-xs text-slate-500">
          By continuing you agree to trade honestly. Accounts that abuse escrow or disputes are suspended.
        </p>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
