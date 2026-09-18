import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lib/api.js', () => ({
  api: {
    get: vi.fn(async (url) => {
      if (url === '/admin/overview') {
        return {
          users: { total: 0, verified: 0, pendingKyc: 0 },
          trades: { active: 0, completed30d: 0, cancelled30d: 0, completionRate30d: 0 },
          volume30d: { ngn: '0', xlm: '0' },
          activeOrders: 0,
        };
      }
      return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1, hasMore: false } };
    }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  setAuthHandlers: vi.fn(),
}));
vi.mock('./lib/socket.js', () => ({ getSocket: vi.fn(() => null), disconnectSocket: vi.fn() }));
vi.mock('./hooks/useSocket.js', () => ({
  useSocket: () => null,
  useSocketEvent: vi.fn(),
  useLiveRefresh: vi.fn(),
  useSocketConnected: () => false,
}));

const { useAuthStore } = await import('./store/authStore.js');
const App = (await import('./App.jsx')).default;

const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: null, user: null, refreshUser: vi.fn(async () => null) });
});

describe('routing for visitors', () => {
  it('opens on the market', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Buy XLM/);
  });

  it('shows the login page', async () => {
    renderAt('/login');
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
  });

  it('sends visitors from a protected page to log in', async () => {
    renderAt('/wallet');
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
  });

  it('keeps the reset and verify links reachable without a session', async () => {
    renderAt('/reset-password');
    expect(await screen.findByRole('heading', { level: 1, name: 'Choose a new password' })).toBeInTheDocument();
  });

  it('shows a 404 page for anything else', async () => {
    renderAt('/nowhere');
    expect(await screen.findByText('Error 404')).toBeInTheDocument();
  });
});

describe('routing for signed-in traders', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'tok',
      user: { id: 'usr_1', displayName: 'ada', role: 'USER', emailVerified: true, kycStatus: 'VERIFIED' },
      refreshUser: vi.fn(async () => null),
    });
  });

  it('refreshes the session so verification flags stay current', async () => {
    const refreshUser = vi.fn(async () => null);
    useAuthStore.setState({ refreshUser });
    renderAt('/');
    await waitFor(() => expect(refreshUser).toHaveBeenCalled());
  });

  it('opens protected pages', async () => {
    renderAt('/trades');
    expect(await screen.findByRole('heading', { level: 1, name: 'My trades' })).toBeInTheDocument();
  });

  it('redirects away from login when already signed in', async () => {
    renderAt('/login');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Buy XLM/);
  });

  it('keeps ordinary traders out of the admin area', async () => {
    renderAt('/admin');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Buy XLM/);
  });
});

describe('routing for admins', () => {
  it('loads the admin area', async () => {
    useAuthStore.setState({
      token: 'tok',
      user: { id: 'adm_1', displayName: 'ops', role: 'ADMIN', emailVerified: true, kycStatus: 'VERIFIED' },
      refreshUser: vi.fn(async () => null),
    });
    renderAt('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Admin' })).toBeInTheDocument();
  });
});
