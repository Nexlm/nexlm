import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('../../lib/socket.js', () => ({ getSocket: vi.fn(), disconnectSocket: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const { useAuthStore } = await import('../../store/authStore.js');
const { disconnectSocket } = await import('../../lib/socket.js');
const { Navbar } = await import('./Navbar.jsx');

const trader = { id: 'usr_1', displayName: 'ada', role: 'USER' };

const renderNav = () => render(<MemoryRouter><Navbar /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: null, user: null });
});

describe('Navbar for visitors', () => {
  it('offers the market, log in and sign up only', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'P2P Market' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: 'Wallet' })).not.toBeInTheDocument();
  });

  it('says which Stellar network the app is on', () => {
    renderNav();
    expect(screen.getByText('Stellar testnet')).toBeInTheDocument();
  });
});

describe('Navbar for signed-in traders', () => {
  beforeEach(() => useAuthStore.setState({ token: 'tok', user: trader }));

  it('opens up trading sections', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'My Trades' })).toHaveAttribute('href', '/trades');
    expect(screen.getByRole('link', { name: 'My Orders' })).toHaveAttribute('href', '/orders');
    expect(screen.getByRole('link', { name: 'Wallet' })).toHaveAttribute('href', '/wallet');
  });

  it('links the profile chip to settings', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /ada/ })).toHaveAttribute('href', '/settings');
  });

  it('hides the admin section from ordinary traders', () => {
    renderNav();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('logs out, drops the socket and returns to login', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(useAuthStore.getState().token).toBeNull();
    expect(disconnectSocket).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});

describe('Navbar for admins', () => {
  it('adds the admin section', () => {
    useAuthStore.setState({ token: 'tok', user: { ...trader, role: 'ADMIN' } });
    renderNav();
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });
});

describe('Navbar on small screens', () => {
  it('toggles the menu', async () => {
    useAuthStore.setState({ token: 'tok', user: trader });
    renderNav();

    const toggle = screen.getByRole('button', { name: 'Toggle menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('link', { name: 'Wallet' }).length).toBeGreaterThan(1);
  });
});
