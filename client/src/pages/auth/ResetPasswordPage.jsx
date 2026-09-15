import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AppLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Feedback.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { api } from '../../lib/api.js';
import { fieldErrors } from '../../lib/forms.js';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    if (password !== confirm) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      const mapped = fieldErrors(err);
      setErrors(mapped);
      if (!mapped.password) setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password">
      {done ? (
        <>
          <Alert tone="success" title="Password updated">
            You can now log in with your new password.
          </Alert>
          <Link to="/login" className="link mt-6 block text-sm">
            Go to log in →
          </Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {!token && <Alert tone="error">This reset link is missing its token.</Alert>}
          {formError && <Alert tone="error">{formError}</Alert>}
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!token}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
