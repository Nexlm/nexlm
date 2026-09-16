import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({
  api: { post: vi.fn(), get: vi.fn() },
  setAuthHandlers: vi.fn(),
}));

const { api } = await import('../../lib/api.js');
const { useAuthStore } = await import('../../store/authStore.js');
const { useToastStore } = await import('../../store/toastStore.js');
const { AccountBanners } = await import('./AccountBanners.jsx');

const setUser = (user) => useAuthStore.setState({ user, token: user ? 'tok' : null });

const renderBanners = () => render(<MemoryRouter><AccountBanners /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  setUser({ email: 'ada@x.ng', emailVerified: true, kycStatus: 'VERIFIED' });
});

describe('AccountBanners', () => {
  it('shows nothing for a logged-out visitor', () => {
    setUser(null);
    const { container } = renderBanners();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing once the account is fully verified', () => {
    const { container } = renderBanners();
    expect(container).toBeEmptyDOMElement();
  });

  it('asks for email verification first', () => {
    setUser({ email: 'ada@x.ng', emailVerified: false, kycStatus: 'UNVERIFIED' });
    renderBanners();
    expect(screen.getByText('Verify your email address')).toBeInTheDocument();
    expect(screen.getByText(/ada@x\.ng/)).toBeInTheDocument();
  });

  it('resends the verification email and confirms it', async () => {
    api.post.mockResolvedValue({});
    setUser({ email: 'ada@x.ng', emailVerified: false, kycStatus: 'UNVERIFIED' });
    renderBanners();

    await userEvent.click(screen.getByRole('button', { name: 'Resend email' }));
    expect(api.post).toHaveBeenCalledWith('/auth/resend-verification');
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({
        tone: 'success',
        message: 'Verification email sent to ada@x.ng',
      }),
    );
  });

  it('reports a failed resend', async () => {
    api.post.mockRejectedValue(new Error('Too many requests'));
    setUser({ email: 'ada@x.ng', emailVerified: false, kycStatus: 'UNVERIFIED' });
    renderBanners();

    await userEvent.click(screen.getByRole('button', { name: 'Resend email' }));
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({ tone: 'error', message: 'Too many requests' }),
    );
  });

  it('points unverified traders at the KYC page', () => {
    setUser({ email: 'ada@x.ng', emailVerified: true, kycStatus: 'UNVERIFIED' });
    renderBanners();
    expect(screen.getByText('Verify your identity to start trading')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verify now' })).toHaveAttribute('href', '/kyc');
  });

  it('lets a rejected trader try again', () => {
    setUser({ email: 'ada@x.ng', emailVerified: true, kycStatus: 'REJECTED' });
    renderBanners();
    expect(screen.getByText('Identity verification failed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verify now' })).toBeInTheDocument();
  });

  it('says a submission is under review', () => {
    setUser({ email: 'ada@x.ng', emailVerified: true, kycStatus: 'PENDING' });
    renderBanners();
    expect(screen.getByText('Verification under review')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Verify now' })).not.toBeInTheDocument();
  });
});
