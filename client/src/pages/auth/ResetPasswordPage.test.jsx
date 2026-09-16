import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../../lib/api.js');
const ResetPasswordPage = (await import('./ResetPasswordPage.jsx')).default;

const token = 'a1'.repeat(32);

const renderPage = (entry = `/reset-password?token=${token}`) =>
  render(<MemoryRouter initialEntries={[entry]}><ResetPasswordPage /></MemoryRouter>);

const submit = async ({ password = 'naira2027', confirm = 'naira2027' } = {}) => {
  await userEvent.type(screen.getByLabelText('New password'), password);
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  api.post.mockResolvedValue(null);
});

describe('ResetPasswordPage', () => {
  it('sends the token with the new password', async () => {
    renderPage();
    await submit();
    expect(api.post).toHaveBeenCalledWith('/auth/reset-password', { token, password: 'naira2027' });
  });

  it('confirms the change and offers a way to log in', async () => {
    renderPage();
    await submit();

    expect(await screen.findByText('Password updated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to log in/ })).toHaveAttribute('href', '/login');
  });

  it('catches mismatched passwords before calling the API', async () => {
    renderPage();
    await submit({ confirm: 'different1' });

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows password rules from the server', async () => {
    api.post.mockRejectedValue({
      message: 'Invalid request',
      details: [{ path: 'password', message: 'Password must contain a number' }],
    });
    renderPage();
    await submit();
    expect(await screen.findByText('Password must contain a number')).toBeInTheDocument();
  });

  it('explains an expired link', async () => {
    api.post.mockRejectedValue({ message: 'This reset link is invalid or has expired' });
    renderPage();
    await submit();
    expect(await screen.findByText('This reset link is invalid or has expired')).toBeInTheDocument();
  });

  it('refuses to submit a link with no token', () => {
    renderPage('/reset-password');
    expect(screen.getByText('This reset link is missing its token.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update password' })).toBeDisabled();
  });
});
