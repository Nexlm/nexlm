import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../../lib/api.js');
const AdminUsersPage = (await import('./AdminUsersPage.jsx')).default;

const user = (overrides = {}) => ({
  id: 'usr_1',
  displayName: 'ada',
  email: 'ada@x.ng',
  role: 'USER',
  status: 'ACTIVE',
  kycStatus: 'VERIFIED',
  createdAt: '2026-01-15T10:00:00Z',
  ...overrides,
});

const page = (items) => ({
  items,
  pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1, hasMore: false },
});

const renderPage = (entry = '/admin/users') =>
  render(<MemoryRouter initialEntries={[entry]}><AdminUsersPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(page([user()]));
});

describe('AdminUsersPage', () => {
  it('lists accounts with their KYC and account status', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'ada' })).toHaveAttribute('href', '/admin/users/usr_1');
    expect(screen.getByText('ada@x.ng')).toBeInTheDocument();

    // The filter dropdowns carry the same words, so read the table row itself.
    const row = within(screen.getAllByRole('row')[1]);
    expect(row.getByText('Verified')).toBeInTheDocument();
    expect(row.getByText('Active')).toBeInTheDocument();
  });

  it('marks admin accounts', async () => {
    api.get.mockResolvedValue(page([user({ role: 'ADMIN' })]));
    renderPage();
    expect(await screen.findByText(/· admin/)).toBeInTheDocument();
  });

  it('starts from the filters in the URL', async () => {
    renderPage('/admin/users?kycStatus=PENDING');
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/admin/users', { q: '', status: '', kycStatus: 'PENDING', page: 1 }),
    );
  });

  it('filters by account status', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'ada' });

    await userEvent.selectOptions(screen.getByLabelText('Account status'), 'SUSPENDED');
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/admin/users', { q: '', status: 'SUSPENDED', kycStatus: '', page: 1 }),
    );
  });

  it('searches by email, name or address after a pause', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'ada' });

    await userEvent.type(screen.getByLabelText('Search users'), 'ada');
    await waitFor(
      () => expect(api.get).toHaveBeenLastCalledWith('/admin/users', { q: 'ada', status: '', kycStatus: '', page: 1 }),
      { timeout: 2000 },
    );
  });

  it('says when no account matches', async () => {
    api.get.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText('No users match these filters')).toBeInTheDocument();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Could not reach Nexlm')).mockResolvedValue(page([user()]));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'ada' })).toBeInTheDocument());
  });
});
