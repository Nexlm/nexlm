import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const { useAuthStore } = await import('../../store/authStore.js');
const LoginPage = (await import('./LoginPage.jsx')).default;

const login = vi.fn();

const renderPage = (entry = '/login') =>
  render(<MemoryRouter initialEntries={[entry]}><LoginPage /></MemoryRouter>);

const submit = async (email = 'ada@x.ng', password = 'naira2026') => {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  login.mockResolvedValue({ id: 'usr_1' });
  useAuthStore.setState({ token: null, user: null, login });
});

describe('LoginPage', () => {
  it('logs in and lands on the market', async () => {
    renderPage();
    await submit();

    expect(login).toHaveBeenCalledWith({ email: 'ada@x.ng', password: 'naira2026' });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('returns you to the page you were trying to reach', async () => {
    renderPage('/login?next=%2Fwallet');
    await submit();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/wallet', { replace: true }));
  });

  it('ignores an off-site redirect', async () => {
    renderPage('/login?next=https%3A%2F%2Fevil.example');
    await submit();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('shows why a login failed and stays put', async () => {
    login.mockRejectedValue({ code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' });
    renderPage();
    await submit();

    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('links to password recovery and registration', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register');
  });
});
