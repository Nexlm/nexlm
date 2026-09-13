import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AppLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Feedback.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { safeRedirect } from '../../lib/forms.js';
import { useAuthStore } from '../../store/authStore.js';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(form);
      navigate(safeRedirect(params.get('next')), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to trade XLM for Naira">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error.message}</Alert>}
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')} required />
        <div>
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={update('password')}
            required
          />
          <Link to="/forgot-password" className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Log in
        </Button>
        <p className="text-center text-sm text-slate-500">
          New to Nexlm?{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
