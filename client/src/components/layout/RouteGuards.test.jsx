import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { post: vi.fn(), get: vi.fn() }, setAuthHandlers: vi.fn() }));

const { useAuthStore } = await import('../../store/authStore.js');
const { GuestOnly, RequireAdmin, RequireAuth } = await import('./RouteGuards.jsx');

/**
 * Public routes live outside the guard so a redirect settles in one step —
 * putting /login inside RequireAuth would loop forever.
 */
const renderApp = (initialEntry) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/wallet" element={<p>Wallet</p>} />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<p>Admin</p>} />
        </Route>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<p>Login</p>} />
        </Route>
        <Route path="/" element={<p>Market</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => useAuthStore.setState({ token: null, user: null }));

describe('RequireAuth', () => {
  it('lets signed-in users through', () => {
    useAuthStore.setState({ token: 'tok' });
    renderApp('/wallet');
    expect(screen.getByText('Wallet')).toBeInTheDocument();
  });

  it('sends visitors to log in', () => {
    renderApp('/wallet');
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('lets admins through', () => {
    useAuthStore.setState({ token: 'tok', user: { role: 'ADMIN' } });
    renderApp('/admin');
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('sends ordinary traders back to the market', () => {
    useAuthStore.setState({ token: 'tok', user: { role: 'USER' } });
    renderApp('/admin');
    expect(screen.getByText('Market')).toBeInTheDocument();
  });

  it('sends logged-out visitors back to the market too', () => {
    renderApp('/admin');
    expect(screen.getByText('Market')).toBeInTheDocument();
  });
});

describe('GuestOnly', () => {
  it('shows the login page to visitors', () => {
    renderApp('/login');
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('redirects signed-in users away from login', () => {
    useAuthStore.setState({ token: 'tok' });
    renderApp('/login');
    expect(screen.getByText('Market')).toBeInTheDocument();
  });
});
