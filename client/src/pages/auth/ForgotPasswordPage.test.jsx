import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../../lib/api.js');
const ForgotPasswordPage = (await import('./ForgotPasswordPage.jsx')).default;

const renderPage = () => render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);

const submit = async (email = 'ada@x.ng') => {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  api.post.mockResolvedValue(null);
});

describe('ForgotPasswordPage', () => {
  it('requests a reset link', async () => {
    renderPage();
    await submit();
    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'ada@x.ng' });
  });

  it('answers the same way whether or not the email is registered', async () => {
    renderPage();
    await submit();

    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    expect(screen.getByText(/If ada@x\.ng is registered/)).toBeInTheDocument();
    expect(screen.getByText(/expires in 1 hour/)).toBeInTheDocument();
  });

  it('hides the form once the link is sent', async () => {
    renderPage();
    await submit();
    expect(screen.queryByRole('button', { name: 'Send reset link' })).not.toBeInTheDocument();
  });

  it('reports a failure and keeps the form', async () => {
    api.post.mockRejectedValue(new Error('Too many requests. Please slow down.'));
    renderPage();
    await submit();

    expect(await screen.findByText('Too many requests. Please slow down.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
  });

  it('links back to log in', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Back to log in' })).toHaveAttribute('href', '/login');
  });
});
