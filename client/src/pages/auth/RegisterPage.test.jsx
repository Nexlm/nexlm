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
const { useToastStore } = await import('../../store/toastStore.js');
const RegisterPage = (await import('./RegisterPage.jsx')).default;

const register = vi.fn();

const renderPage = () => render(<MemoryRouter><RegisterPage /></MemoryRouter>);

const fill = async ({ password = 'naira2026', confirm = 'naira2026' } = {}) => {
  await userEvent.type(screen.getByLabelText('Email'), 'ada@x.ng');
  await userEvent.type(screen.getByLabelText('Display name'), 'ada');
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.type(screen.getByLabelText('Confirm password'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  register.mockResolvedValue({ id: 'usr_1' });
  useAuthStore.setState({ token: null, user: null, register });
});

describe('RegisterPage', () => {
  it('says a Stellar wallet comes with the account', () => {
    renderPage();
    expect(screen.getByText('You get a Stellar wallet the moment you sign up.')).toBeInTheDocument();
  });

  it('creates the account and opens the wallet', async () => {
    renderPage();
    await fill();

    expect(register).toHaveBeenCalledWith({ email: 'ada@x.ng', displayName: 'ada', password: 'naira2026' });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/wallet', { replace: true }));
    expect(useToastStore.getState().toasts[0].message).toContain('verify your email');
  });

  it('catches mismatched passwords before calling the API', async () => {
    renderPage();
    await fill({ confirm: 'different1' });

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('shows server field errors', async () => {
    register.mockRejectedValue({
      message: 'Invalid request',
      details: [{ path: 'displayName', message: 'That display name is taken' }],
    });
    renderPage();
    await fill();

    expect(await screen.findByText('That display name is taken')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a whole-form error when no field is named', async () => {
    register.mockRejectedValue({ code: 'CONFLICT', message: 'An account with this email already exists' });
    renderPage();
    await fill();

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument();
  });

  it('links to login for returning traders', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });
});
