import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('../../hooks/useSocket.js', () => ({
  useSocket: () => null,
  useSocketEvent: vi.fn(),
  useLiveRefresh: vi.fn(),
  useSocketConnected: () => false,
}));

const { api } = await import('../../lib/api.js');
const AdminTradesPage = (await import('./AdminTradesPage.jsx')).default;

const trade = (overrides = {}) => ({
  id: 'trd_1',
  status: 'PAID',
  xlmAmount: '250',
  ngnAmount: '375000.00',
  paymentMethod: 'OPAY',
  updatedAt: new Date().toISOString(),
  buyer: { id: 'buyer', displayName: 'ada' },
  seller: { id: 'seller', displayName: 'tunde' },
  ...overrides,
});

const page = (items) => ({
  items,
  pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1, hasMore: false },
});

const renderPage = () => render(<MemoryRouter><AdminTradesPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(page([trade()]));
});

describe('AdminTradesPage', () => {
  it('lists trades with both parties and the money involved', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: '250 XLM' })).toHaveAttribute('href', '/admin/trades/trd_1');
    expect(screen.getByText('ada → tunde')).toBeInTheDocument();
    expect(screen.getByText(/375,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('OPay')).toBeInTheDocument();
  });

  it('says the newest activity comes first', async () => {
    renderPage();
    expect(await screen.findByText('Most recently updated first')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/admin/trades', { status: '', page: 1 });
  });

  it('shows the trade status in the row', async () => {
    renderPage();
    const row = within((await screen.findAllByRole('row'))[1]);
    expect(row.getByText('Paid · awaiting release')).toBeInTheDocument();
  });

  it('filters by status and returns to the first page', async () => {
    renderPage();
    await screen.findByText('ada → tunde');

    await userEvent.selectOptions(screen.getByLabelText('Trade status'), 'ESCROW_LOCKED');
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/admin/trades', { status: 'ESCROW_LOCKED', page: 1 }),
    );
  });

  it('says when nothing matches', async () => {
    api.get.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText('No trades')).toBeInTheDocument();
  });

  it('offers a retry when the monitor cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Could not reach Nexlm')).mockResolvedValue(page([trade()]));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('ada → tunde')).toBeInTheDocument());
  });
});
