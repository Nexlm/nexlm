import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('../../lib/socket.js', () => ({ getSocket: vi.fn(), disconnectSocket: vi.fn() }));

const { useAuthStore } = await import('../../store/authStore.js');
const { AppLayout, AuthLayout } = await import('./AppLayout.jsx');

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/wallet']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/wallet" element={<p>Wallet page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null });
});

describe('AppLayout', () => {
  it('wraps the current page with navigation and footer', () => {
    renderApp();
    expect(screen.getByText('Wallet page')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'P2P Market' })).toBeInTheDocument();
    expect(screen.getByText(/Nexlm never holds your Naira/)).toBeInTheDocument();
  });

  it('shows verification nudges above the page', () => {
    useAuthStore.setState({ token: 'tok', user: { email: 'ada@x.ng', emailVerified: false, kycStatus: 'UNVERIFIED' } });
    renderApp();
    expect(screen.getByText('Verify your email address')).toBeInTheDocument();
  });
});

describe('AuthLayout', () => {
  const renderAuth = () =>
    render(
      <MemoryRouter>
        <AuthLayout title="Welcome back" subtitle="Log in to trade XLM for Naira.">
          <button type="button">Log in</button>
        </AuthLayout>
      </MemoryRouter>,
    );

  it('frames the form with its title and subtitle', () => {
    renderAuth();
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Log in to trade XLM for Naira.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('sells the escrow promise beside the form', () => {
    renderAuth();
    expect(screen.getByText('escrow per trade')).toBeInTheDocument();
    expect(screen.getByText('trading fees')).toBeInTheDocument();
    expect(screen.getByText(/Bank transfer · OPay · PalmPay/)).toBeInTheDocument();
  });

  it('always offers a way back to the market', () => {
    renderAuth();
    expect(screen.getByRole('link', { name: /Back to the market/ })).toHaveAttribute('href', '/');
  });
});
