import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('../hooks/useSocket.js', () => ({
  useSocket: () => null,
  useSocketEvent: vi.fn(),
  useLiveRefresh: vi.fn(),
  useSocketConnected: () => false,
}));

const { api } = await import('../lib/api.js');
const { useAuthStore } = await import('../store/authStore.js');
const { useToastStore } = await import('../store/toastStore.js');
const TradeRoomPage = (await import('./TradeRoomPage.jsx')).default;

const trade = (overrides = {}) => ({
  id: 'trd_1',
  role: 'BUYER',
  status: 'ESCROW_LOCKED',
  actions: ['MARK_PAID', 'CANCEL'],
  xlmAmount: '250',
  ngnRate: '1500',
  ngnAmount: '375000.00',
  paymentMethod: 'OPAY',
  createdAt: '2026-09-01T12:00:00Z',
  paymentDeadline: new Date(Date.now() + 600_000).toISOString(),
  escrowPublicKey: 'GESCROWADDRESS',
  paymentAccount: { method: 'OPAY', accountName: 'Ada Obi', accountNumber: '8031234567' },
  buyer: { id: 'buyer', displayName: 'ada', kycStatus: 'VERIFIED' },
  seller: { id: 'seller', displayName: 'tunde', kycStatus: 'VERIFIED' },
  order: { terms: 'Pay within 10 minutes.' },
  links: { escrow: 'https://stellar.expert/explorer/testnet/tx/lockhash', release: null, refund: null },
  ...overrides,
});

const renderRoom = () =>
  render(
    <MemoryRouter initialEntries={['/trades/trd_1']}>
      <Routes>
        <Route path="/trades/:id" element={<TradeRoomPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  useAuthStore.setState({ token: 'tok', user: { id: 'buyer', displayName: 'ada' } });
  api.get.mockImplementation((path) =>
    path === '/trades/trd_1' ? Promise.resolve(trade()) : Promise.resolve({ items: [] }),
  );
});

describe('TradeRoomPage for the buyer', () => {
  it('shows the deal and the counterparty', async () => {
    renderRoom();
    expect(await screen.findByText(/Buying from tunde/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Buy 250 XLM');
    // The total shows in the facts row and again in the payment details.
    expect(screen.getAllByText(/375,000\.00/).length).toBeGreaterThan(0);
  });

  it('shows the payment window countdown', async () => {
    renderRoom();
    expect(await screen.findByRole('timer')).toBeInTheDocument();
  });

  it('shows where to pay while payment is due', async () => {
    renderRoom();
    expect(await screen.findByText('Send exactly this amount')).toBeInTheDocument();
    expect(screen.getByText('8031234567')).toBeInTheDocument();
  });

  it('shows the advertiser terms', async () => {
    renderRoom();
    expect(await screen.findByText('Pay within 10 minutes.')).toBeInTheDocument();
  });

  it('links the escrow lock transaction on-chain', async () => {
    renderRoom();
    await screen.findByText('On-chain record · Stellar');

    const row = within(screen.getByText('Lock').closest('li'));
    expect(row.getByRole('link')).toHaveAttribute('href', 'https://stellar.expert/explorer/testnet/tx/lockhash');
    expect(screen.getByText(/Escrow account GESCROWADDRESS/)).toBeInTheDocument();
  });

  it('confirms before marking a trade as paid', async () => {
    api.post.mockResolvedValue(trade({ status: 'PAID', actions: [] }));
    renderRoom();

    await userEvent.click(await screen.findByRole('button', { name: 'I have paid' }));
    expect(await screen.findByText(/Marking a trade as paid without paying/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Yes, I've paid/ }));
    expect(api.post).toHaveBeenCalledWith('/trades/trd_1/paid');
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0].message).toBe('Marked as paid. The seller has been notified.'),
    );
  });

  it('warns before cancelling', async () => {
    renderRoom();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel trade' }));

    expect(await screen.findByText(/If you have already sent money, don't cancel/)).toBeInTheDocument();
  });

  it('reports a failed action', async () => {
    api.post.mockRejectedValue(new Error('This trade just changed. Refresh and try again.'));
    renderRoom();

    await userEvent.click(await screen.findByRole('button', { name: 'I have paid' }));
    await userEvent.click(screen.getByRole('button', { name: /Yes, I've paid/ }));

    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({
        tone: 'error',
        message: 'This trade just changed. Refresh and try again.',
      }),
    );
  });
});

describe('TradeRoomPage for the seller', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'tok', user: { id: 'seller', displayName: 'tunde' } });
    api.get.mockImplementation((path) =>
      path === '/trades/trd_1'
        ? Promise.resolve(trade({ role: 'SELLER', status: 'PAID', actions: ['RELEASE'] }))
        : Promise.resolve({ items: [] }),
    );
  });

  it('requires ticking that the Naira arrived before releasing', async () => {
    renderRoom();
    await userEvent.click(await screen.findByRole('button', { name: 'Release XLM' }));

    const release = screen.getByRole('button', { name: /^Release 250 XLM$/ });
    expect(release).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox'));
    expect(release).toBeEnabled();
  });

  it('releases once confirmed', async () => {
    api.post.mockResolvedValue(trade({ role: 'SELLER', status: 'COMPLETED', actions: [] }));
    renderRoom();

    await userEvent.click(await screen.findByRole('button', { name: 'Release XLM' }));
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /^Release 250 XLM$/ }));

    expect(api.post).toHaveBeenCalledWith('/trades/trd_1/release');
    await waitFor(() => expect(useToastStore.getState().toasts[0].message).toBe('XLM released to the buyer.'));
  });

  it('says the release is final', async () => {
    renderRoom();
    await userEvent.click(await screen.findByRole('button', { name: 'Release XLM' }));
    expect(screen.getByText(/Releasing is final/)).toBeInTheDocument();
  });
});

describe('TradeRoomPage when the trade is closed', () => {
  it('offers no actions and no payment details', async () => {
    api.get.mockImplementation((path) =>
      path === '/trades/trd_1'
        ? Promise.resolve(trade({ status: 'COMPLETED', actions: [], links: { escrow: null, release: null, refund: null } }))
        : Promise.resolve({ items: [] }),
    );
    renderRoom();

    expect(await screen.findByText('Trade complete')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'I have paid' })).not.toBeInTheDocument();
    expect(screen.queryByText('Send exactly this amount')).not.toBeInTheDocument();
  });
});
