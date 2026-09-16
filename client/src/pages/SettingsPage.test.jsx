import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  setAuthHandlers: vi.fn(),
}));

const { api } = await import('../lib/api.js');
const { useAuthStore } = await import('../store/authStore.js');
const { useToastStore } = await import('../store/toastStore.js');
const SettingsPage = (await import('./SettingsPage.jsx')).default;

const user = (overrides = {}) => ({
  id: 'usr_1',
  displayName: 'ada',
  email: 'ada@x.ng',
  phone: '+2348031234567',
  emailVerified: true,
  kycStatus: 'VERIFIED',
  stellarPublicKey: 'GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH',
  createdAt: '2026-01-15T10:00:00Z',
  stats: { completedTrades: 12, completionRate: 98.5 },
  ...overrides,
});

const renderPage = () => render(<MemoryRouter><SettingsPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  api.get.mockResolvedValue({ items: [] });
  useAuthStore.setState({ token: 'tok', user: user() });
});

describe('SettingsPage account summary', () => {
  it('shows the account identity and wallet', () => {
    renderPage();
    expect(screen.getByText('ada')).toBeInTheDocument();
    expect(screen.getByText('ada@x.ng')).toBeInTheDocument();
    expect(screen.getByText(/^GA6HCM/)).toBeInTheDocument();
  });

  it('flags an unverified email', () => {
    useAuthStore.setState({ user: user({ emailVerified: false }) });
    renderPage();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('offers a verification link until identity is confirmed', () => {
    useAuthStore.setState({ user: user({ kycStatus: 'UNVERIFIED' }) });
    renderPage();
    expect(screen.getByRole('link', { name: 'Verify' })).toHaveAttribute('href', '/kyc');
  });

  it('hides the verification link once verified', () => {
    renderPage();
    expect(screen.queryByRole('link', { name: 'Verify' })).not.toBeInTheDocument();
  });

  it('shows reputation when the trader has history', () => {
    renderPage();
    expect(screen.getByText('12 trades · 98.5% completion')).toBeInTheDocument();
  });

  it('renders nothing for a logged-out visitor', () => {
    useAuthStore.setState({ token: null, user: null });
    const { container } = renderPage();
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SettingsPage phone number', () => {
  it('saves a new phone number and confirms it', async () => {
    api.patch.mockResolvedValue({ user: { phone: '+2347031234567' } });
    renderPage();

    const field = screen.getByLabelText('Phone number');
    await userEvent.clear(field);
    await userEvent.type(field, '07031234567');
    await userEvent.click(screen.getByRole('button', { name: 'Save phone' }));

    expect(api.patch).toHaveBeenCalledWith('/users/me', { phone: '07031234567' });
    await waitFor(() => expect(useToastStore.getState().toasts[0]).toMatchObject({ tone: 'success' }));
  });

  it('shows a validation error on the field', async () => {
    api.patch.mockRejectedValue({
      message: 'Invalid request',
      details: [{ path: 'phone', message: 'Enter a valid Nigerian phone number' }],
    });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Save phone' }));
    expect(await screen.findByText('Enter a valid Nigerian phone number')).toBeInTheDocument();
  });

  it('falls back to the error message when no field is named', async () => {
    api.patch.mockRejectedValue({ message: 'Too many requests' });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'Save phone' }));
    expect(await screen.findByText('Too many requests')).toBeInTheDocument();
  });
});
