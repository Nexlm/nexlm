import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AppLayout.jsx';
import { Alert, Spinner } from '../../components/ui/Feedback.jsx';
import { api } from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const setUser = useAuthStore((s) => s.setUser);
  const loggedIn = useAuthStore((s) => Boolean(s.token));
  const [state, setState] = useState(token ? 'loading' : 'missing');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api
      .post('/auth/verify-email', { token })
      .then(({ user }) => {
        if (loggedIn) setUser(user);
        setState('success');
      })
      .catch((err) => {
        setMessage(err.message);
        setState('error');
      });
  }, [token, loggedIn, setUser]);

  return (
    <AuthLayout title="Email verification">
      {state === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-6 text-sm text-slate-600">
          <Spinner /> Verifying your email…
        </div>
      )}
      {state === 'success' && (
        <Alert tone="success" title="Your email is verified">
          Next step: verify your identity so you can start trading.
        </Alert>
      )}
      {state === 'error' && <Alert tone="error" title="Verification failed">{message}</Alert>}
      {state === 'missing' && <Alert tone="error">This link is missing its verification token.</Alert>}
      <div className="mt-6 text-center">
        <Link to={state === 'success' && loggedIn ? '/kyc' : '/'} className="text-sm font-medium text-brand-700 hover:underline">
          {state === 'success' && loggedIn ? 'Continue to identity verification →' : 'Go to Nexlm →'}
        </Link>
      </div>
    </AuthLayout>
  );
}
