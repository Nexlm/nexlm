import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  setAuthHandlers: vi.fn(),
}));

const { api } = await import('../../lib/api.js');
const { useToastStore } = await import('../../store/toastStore.js');
const AdminUserDetailPage = (await import('./AdminUserDetailPage.jsx')).default;

const account = (overrides = {}) => ({
  id: 'usr_1',
  displayName: 'ada',
  email: 'ada@x.ng',
  phone: '+2348031234567',
  role: 'USER',
  status: 'ACTIVE',
  emailVerified: true,
  kycStatus: 'PENDING',
  kycIdType: 'BVN',
  kycIdLast4: '5678',
  kycFullName: 'Ada Obi',
  kycReference: null,
  kycSubmittedAt: '2026-09-01T12:00:00Z',
  kycReviewedAt: null,
  stellarPublicKey: 'GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH',
  createdAt: '2026-01-15T10:00:00Z',
  stats: { completedTrades: 12, completionRate: 98.5 },
  recentTrades: [],
  paymentAccounts: [{ id: 'pa_1', method: 'OPAY', bankName: null, accountName: 'Ada Obi', accountNumber: '8031234567' }],
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/users/usr_1']}>
      <Routes>
        <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  api.get.mockResolvedValue(account());
});

describe('AdminUserDetailPage', () => {
  it('shows the account, reputation and wallet', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'ada' })).toBeInTheDocument();
    expect(screen.getByText(/ada@x\.ng/)).toBeInTheDocument();
    expect(screen.getByText('12 trades · 98.5%')).toBeInTheDocument();
    expect(screen.getByText(/^GA6HCM/)).toBeInTheDocument();
  });

  it('shows the submitted identity without the full ID number', async () => {
    renderPage();
    expect(await screen.findByText('Ada Obi')).toBeInTheDocument();
    expect(screen.getByText('BVN ···5678')).toBeInTheDocument();
    expect(screen.getByText('Manual review')).toBeInTheDocument();
  });

  it('asks the reviewer to match the name to the payout account', async () => {
    renderPage();
    expect(await screen.findByText(/Confirm the name matches the payout account/)).toBeInTheDocument();
    expect(screen.getByText('8031234567')).toBeInTheDocument();
  });

  it('approves a pending verification', async () => {
    api.post.mockResolvedValue({ kycStatus: 'VERIFIED' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(api.post).toHaveBeenCalledWith('/admin/kyc/usr_1', { decision: 'APPROVE' });
    await waitFor(() => expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'KYC approved' }));
  });

  it('rejects a pending verification', async () => {
    api.post.mockResolvedValue({ kycStatus: 'REJECTED' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    expect(api.post).toHaveBeenCalledWith('/admin/kyc/usr_1', { decision: 'REJECT' });
  });

  it('hides review buttons when nothing is pending', async () => {
    api.get.mockResolvedValue(account({ kycStatus: 'VERIFIED', kycReviewedAt: '2026-09-02T12:00:00Z' }));
    renderPage();

    await screen.findByRole('heading', { name: 'ada' });
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('suspends and bans an account', async () => {
    api.patch.mockResolvedValue({ status: 'SUSPENDED' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    expect(api.patch).toHaveBeenCalledWith('/admin/users/usr_1/status', { status: 'SUSPENDED' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reactivate' })).toBeInTheDocument());
  });

  it('reports a failed action', async () => {
    api.patch.mockRejectedValue(new Error('Admin accounts cannot be restricted here'));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ban' }));
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({
        tone: 'error',
        message: 'Admin accounts cannot be restricted here',
      }),
    );
  });

  it('offers no status controls for admin accounts', async () => {
    api.get.mockResolvedValue(account({ role: 'ADMIN' }));
    renderPage();

    await screen.findByRole('heading', { name: 'ada' });
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ban' })).not.toBeInTheDocument();
  });

  it('says when no identity was ever submitted', async () => {
    api.get.mockResolvedValue(account({ kycStatus: 'UNVERIFIED', kycSubmittedAt: null }));
    renderPage();
    expect(await screen.findByText('No identity details submitted.')).toBeInTheDocument();
  });

  it('links back to the user list', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: /All users/ })).toHaveAttribute('href', '/admin/users');
  });
});
