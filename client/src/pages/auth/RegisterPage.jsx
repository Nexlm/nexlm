import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AppLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Feedback.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { fieldErrors } from '../../lib/forms.js';
import { useAuthStore } from '../../store/authStore.js';
import { toast } from '../../store/toastStore.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';

export default function RegisterPage() {
  usePageTitle('Create your account');
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
    <AuthLayout title="Create your account" subtitle="You get a Stellar wallet the moment you sign up.">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            hint="8+ characters, a letter and a number."
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={update('confirm')}
            error={errors.confirm}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
        <p className="text-xs text-moss">Accounts that abuse escrow or payment claims are suspended.</p>
        <p className="text-sm text-moss">
          Already have an account?{' '}
          <Link to="/login" className="link">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
