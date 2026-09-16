import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../../lib/api.js');
const { useAuthStore } = await import('../../store/authStore.js');
const VerifyEmailPage = (await import('./VerifyEmailPage.jsx')).default;

const token = 'a1'.repeat(32);

const renderPage = (entry = `/verify-email?token=${token}`) =>
  render(<MemoryRouter initialEntries={[entry]}><VerifyEmailPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: null, user: null, setUser: vi.fn() });
  api.post.mockResolvedValue({ user: { id: 'usr_1', emailVerified: true } });
});

describe('VerifyEmailPage', () => {
  it('verifies the token from the link', async () => {
    renderPage();
    expect(await screen.findByText('Your email is verified')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { token });
  });

  it('only sends the token once', async () => {
    renderPage();
    await screen.findByText('Your email is verified');
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('sends a signed-in trader on to identity verification', async () => {
    const setUser = vi.fn();
    useAuthStore.setState({ token: 'tok', setUser });
    renderPage();

    await screen.findByText('Your email is verified');
    expect(setUser).toHaveBeenCalledWith({ id: 'usr_1', emailVerified: true });
    expect(screen.getByRole('link', { name: /Continue to identity verification/ })).toHaveAttribute('href', '/kyc');
  });

  it('sends a logged-out visitor to the market', async () => {
    renderPage();
    await screen.findByText('Your email is verified');
    expect(screen.getByRole('link', { name: /Go to Nexlm/ })).toHaveAttribute('href', '/');
  });

  it('explains a used or invalid link', async () => {
    api.post.mockRejectedValue(new Error('This verification link is invalid or has already been used'));
    renderPage();

    expect(await screen.findByText('Verification failed')).toBeInTheDocument();
    expect(screen.getByText('This verification link is invalid or has already been used')).toBeInTheDocument();
  });

  it('says when the link has no token at all', () => {
    renderPage('/verify-email');
    expect(screen.getByText('This link is missing its verification token.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
