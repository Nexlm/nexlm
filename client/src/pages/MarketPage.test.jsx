import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('../hooks/useSocket.js', () => ({
  useSocket: () => null,
  useSocketEvent: vi.fn(),
  useLiveRefresh: vi.fn(),
  useSocketConnected: () => false,
}));

const { api } = await import('../lib/api.js');
const { useAuthStore } = await import('../store/authStore.js');
const MarketPage = (await import('./MarketPage.jsx')).default;

const order = (overrides = {}) => ({
  id: 'ord_1',
  type: 'SELL',
  xlmAmount: '250',
  ngnRate: '1500',
  paymentMethods: ['OPAY'],
  user: { id: 'other', displayName: 'ada', kycStatus: 'VERIFIED' },
  ...overrides,
});

const page = (items, pagination = {}) => ({
  items,
  pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1, hasMore: false, ...pagination },
});

const renderMarket = (entry = '/') => render(<MemoryRouter initialEntries={[entry]}><MarketPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: null, user: null });
  api.get.mockResolvedValue(page([order()]));
});

describe('MarketPage', () => {
  it('opens on sell offers so a visitor can buy', async () => {
    renderMarket();
    await screen.findByText('ada');
    expect(api.get).toHaveBeenCalledWith('/orders', expect.objectContaining({ type: 'SELL', page: 1 }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Buy XLM');
  });

  it('highlights the best price on the book', async () => {
    renderMarket();
    expect(await screen.findByText('Best ask')).toBeInTheDocument();
  });

  it('switches to buy offers when selling', async () => {
    renderMarket();
    await screen.findByText('ada');

    await userEvent.click(screen.getByRole('tab', { name: 'Sell XLM' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/orders', expect.objectContaining({ type: 'BUY', page: 1 })),
    );
    expect(screen.getByText('Best bid')).toBeInTheDocument();
  });

  it('starts from the filters in the URL, so a market link can be shared', async () => {
    renderMarket('/?side=sell&method=KUDA&page=2');
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/orders', expect.objectContaining({ type: 'BUY', paymentMethod: 'KUDA', page: 2 })),
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sell XLM');
  });

  it('filters by payment method', async () => {
    renderMarket();
    await screen.findByText('ada');

    await userEvent.selectOptions(screen.getByLabelText('Payment method'), 'KUDA');
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/orders', expect.objectContaining({ paymentMethod: 'KUDA' })),
    );
  });

  it('refreshes on demand', async () => {
    renderMarket();
    await screen.findByText('ada');

    await userEvent.click(screen.getByRole('button', { name: 'Refresh orders' }));
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(1));
  });

  it('suggests posting an order when the book is empty', async () => {
    api.get.mockResolvedValue(page([]));
    renderMarket();
    expect(await screen.findByText('No sellers right now')).toBeInTheDocument();
  });

  it('offers a retry when the market cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Could not reach Nexlm')).mockResolvedValue(page([order()]));
    renderMarket();

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('ada')).toBeInTheDocument());
  });

  it('only shows "Post an order" to signed-in traders', async () => {
    renderMarket();
    await screen.findByText('ada');
    expect(screen.queryByRole('link', { name: /Post an order/ })).not.toBeInTheDocument();

    useAuthStore.setState({ token: 'tok', user: { id: 'usr_1' } });
    await waitFor(() => expect(screen.getByRole('link', { name: /Post an order/ })).toBeInTheDocument());
  });

  it('marks your own offer instead of offering to trade with yourself', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 'other' } });
    renderMarket();
    expect(await screen.findByText('Your order')).toBeInTheDocument();
  });

  it('opens the trade dialog for someone else’s offer', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 'usr_1' } });
    renderMarket();

    await userEvent.click(await screen.findByRole('button', { name: 'Buy XLM' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
