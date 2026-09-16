import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../../lib/api.js');
const { useToastStore } = await import('../../store/toastStore.js');
const { ChangePasswordForm } = await import('./ChangePasswordForm.jsx');

const fill = async ({ current = 'naira2026', next = 'naira2027', confirm = 'naira2027' } = {}) => {
  await userEvent.type(screen.getByLabelText('Current password'), current);
  await userEvent.type(screen.getByLabelText('New password'), next);
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Update password' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  api.post.mockResolvedValue(null);
});

describe('ChangePasswordForm', () => {
  it('changes the password and clears the form', async () => {
    render(<ChangePasswordForm />);
    await fill();

    expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'naira2026',
      newPassword: 'naira2027',
    });
    await waitFor(() => expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Password updated' }));
    expect(screen.getByLabelText('Current password')).toHaveValue('');
  });

  it('catches a mistyped confirmation before calling the API', async () => {
    render(<ChangePasswordForm />);
    await fill({ confirm: 'different1' });

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows password rules from the server on the new password', async () => {
    api.post.mockRejectedValue({
      message: 'Invalid request',
      details: [{ path: 'newPassword', message: 'New password must be different from the current one' }],
    });
    render(<ChangePasswordForm />);
    await fill();

    expect(await screen.findByText('New password must be different from the current one')).toBeInTheDocument();
  });

  it('shows a wrong current password against that field', async () => {
    api.post.mockRejectedValue({ message: 'Your current password is incorrect' });
    render(<ChangePasswordForm />);
    await fill();

    expect(await screen.findByText('Your current password is incorrect')).toBeInTheDocument();
  });

  it('keeps what you typed when the change fails', async () => {
    api.post.mockRejectedValue({ message: 'Your current password is incorrect' });
    render(<ChangePasswordForm />);
    await fill();

    await screen.findByText('Your current password is incorrect');
    expect(screen.getByLabelText('New password')).toHaveValue('naira2027');
  });
});
