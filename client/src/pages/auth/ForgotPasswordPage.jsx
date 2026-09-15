import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AppLayout.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert } from '../../components/ui/Feedback.jsx';
import { Input } from '../../components/ui/Field.jsx';
import { api } from '../../lib/api.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <Alert tone="success" title="Check your inbox">
          If {email} is registered, a reset link is on its way. It expires in 1 hour.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && <Alert tone="error">{error.message}</Alert>}
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link to="/login" className="link">
          Back to log in
        </Link>
      </p>
    </AuthLayout>
  );
}
