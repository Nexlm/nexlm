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
const TradesPage = (await import('./TradesPage.jsx')).default;

const trade = (overrides = {}) => ({
  id: 'trd_1',
  role: 'BUYER',
  status: 'ESCROW_LOCKED',
  xlmAmount: '250',
  ngnAmount: '375000.00',
  paymentMethod: 'OPAY',
  createdAt: new Date().toISOString(),
  buyer: { id: 'buyer', displayName: 'ada', kycStatus: 'VERIFIED' },
  seller: { id: 'seller', displayName: 'tunde', kycStatus: 'VERIFIED' },
  ...overrides,
});

const page = (items, pagination = {}) => ({
  items,
  pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1, hasMore: false, ...pagination },
});

const renderPage = (entry = '/trades') => render(<MemoryRouter initialEntries={[entry]}><TradesPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(page([trade()]));
});

describe('TradesPage', () => {
  it('opens on trades that still need attention', async () => {
    renderPage();
    await screen.findByText('Buying');
    expect(api.get).toHaveBeenCalledWith('/trades', { scope: 'active', page: 1 });
  });

  it('shows the side, amount, counterparty and status of each trade', async () => {
    renderPage();
    expect(await screen.findByText('Buying')).toBeInTheDocument();
    expect(screen.getByText('250 XLM')).toBeInTheDocument();
    expect(screen.getByText(/375,000\.00/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'tunde' })).toBeInTheDocument();
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument();
  });

  it('shows the buyer as the counterparty when selling', async () => {
    api.get.mockResolvedValue(page([trade({ role: 'SELLER' })]));
    renderPage();
    expect(await screen.findByText('Selling')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ada' })).toBeInTheDocument();
  });

  it('links each row to its trade room', async () => {
    renderPage();
    const links = await screen.findAllByRole('link');
    expect(links.some((a) => a.getAttribute('href') === '/trades/trd_1')).toBe(true);
  });

  it('switches scope and resets to the first page', async () => {
    renderPage();
    await screen.findByText('Buying');

    await userEvent.click(screen.getByRole('tab', { name: 'Completed' }));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/trades', { scope: 'completed', page: 1 }));
  });

  it('starts from the scope in the URL', async () => {
    renderPage('/trades?scope=completed&page=2');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/trades', { scope: 'completed', page: 2 }));
  });

  it('ignores a scope it does not recognise', async () => {
    renderPage('/trades?scope=disputed');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/trades', { scope: 'active', page: 1 }));
  });

  it('points first-time traders at the market', async () => {
    api.get.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText('No trades yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse the market/ })).toHaveAttribute('href', '/');
  });

  it('offers a retry when trades cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Could not reach Nexlm')).mockResolvedValue(page([trade()]));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Buying')).toBeInTheDocument());
  });
});
