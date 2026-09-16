import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../lib/api.js');
const { useToastStore } = await import('../store/toastStore.js');
const MyOrdersPage = (await import('./MyOrdersPage.jsx')).default;

const order = (overrides = {}) => ({
  id: 'ord_1',
  type: 'SELL',
  status: 'ACTIVE',
  xlmAmount: '250',
  ngnRate: '1500',
  paymentMethods: ['OPAY'],
  expiresAt: '2026-09-01T12:30:00Z',
  ...overrides,
});

const page = (items) => ({
  items,
  pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1, hasMore: false },
});

const renderPage = () => render(<MemoryRouter><MyOrdersPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  api.get.mockResolvedValue(page([order()]));
});

describe('MyOrdersPage', () => {
  it('lists every order by default', async () => {
    renderPage();
    await screen.findByText('Sell');
    expect(api.get).toHaveBeenCalledWith('/orders/mine', { status: '', page: 1 });
  });

  it('shows the amount, price, rails and status', async () => {
    renderPage();
    expect(await screen.findByText('250 XLM')).toBeInTheDocument();
    expect(screen.getByText(/1,500\.00/)).toBeInTheDocument();
    expect(screen.getByText('OPay')).toBeInTheDocument();
    // "Active" is also a filter tab, so look inside the table row.
    expect(screen.getByRole('cell', { name: 'Active' })).toBeInTheDocument();
  });

  it('filters by status', async () => {
    renderPage();
    await screen.findByText('Sell');

    await userEvent.click(screen.getByRole('tab', { name: 'Expired' }));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/orders/mine', { status: 'EXPIRED', page: 1 }));
  });

  it('cancels an active order and refreshes', async () => {
    api.post.mockResolvedValue({});
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(api.post).toHaveBeenCalledWith('/orders/ord_1/cancel');
    await waitFor(() => expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'Order cancelled' }));
  });

  it('reports a cancellation that lost the race', async () => {
    api.post.mockRejectedValue(new Error('This order was just matched and can no longer be cancelled'));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({
        tone: 'error',
        message: 'This order was just matched and can no longer be cancelled',
      }),
    );
  });

  it('offers no cancel button for closed orders', async () => {
    api.get.mockResolvedValue(page([order({ status: 'FILLED' })]));
    renderPage();

    expect(await screen.findByText('Matched')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('invites a first order when there are none', async () => {
    api.get.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText('No orders here')).toBeInTheDocument();
  });

  it('always links to the new order form', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: /New order/ })).toHaveAttribute('href', '/orders/new');
  });

  it('offers a retry when orders cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Could not reach Nexlm')).mockResolvedValue(page([order()]));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Sell')).toBeInTheDocument());
  });
});
