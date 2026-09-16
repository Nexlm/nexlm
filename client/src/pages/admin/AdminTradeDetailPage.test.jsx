import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('../../hooks/useSocket.js', () => ({
  useSocket: () => null,
  useSocketEvent: vi.fn(),
  useLiveRefresh: vi.fn(),
  useSocketConnected: () => false,
}));

const { api } = await import('../../lib/api.js');
const { useAuthStore } = await import('../../store/authStore.js');
const AdminTradeDetailPage = (await import('./AdminTradeDetailPage.jsx')).default;

const trade = (overrides = {}) => ({
  id: 'trd_1',
  status: 'COMPLETED',
  xlmAmount: '250',
  ngnRate: '1500',
  ngnAmount: '375000.00',
  paymentMethod: 'OPAY',
  createdAt: '2026-09-01T12:00:00Z',
  paymentDeadline: '2026-09-01T12:15:00Z',
  paidAt: '2026-09-01T12:05:00Z',
  completedAt: '2026-09-01T12:08:00Z',
  cancelledAt: null,
  cancelReason: null,
  escrowPublicKey: 'GESCROWADDRESS',
  buyerId: 'buyer',
  sellerId: 'seller',
  buyer: { id: 'buyer', displayName: 'ada', kycStatus: 'VERIFIED' },
  seller: { id: 'seller', displayName: 'tunde', kycStatus: 'VERIFIED' },
  paymentAccount: { accountName: 'Tunde Bello', accountNumber: '8031234567' },
  links: {
    escrow: 'https://stellar.expert/explorer/testnet/tx/lockhash',
    release: 'https://stellar.expert/explorer/testnet/tx/releasehash',
    refund: null,
  },
  messages: [{ id: 'm1', senderId: 'buyer', content: 'Sent via OPay', createdAt: '2026-09-01T12:05:00Z', sender: { displayName: 'ada' } }],
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/trades/trd_1']}>
      <Routes>
        <Route path="/admin/trades/:id" element={<AdminTradeDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: 'tok', user: { id: 'adm_1', role: 'ADMIN' } });
  api.get.mockImplementation((path) =>
    path === '/admin/trades/trd_1' ? Promise.resolve(trade()) : Promise.resolve({ items: [] }),
  );
});

describe('AdminTradeDetailPage', () => {
  it('shows the money and the trade timeline', async () => {
    renderPage();
    expect(await screen.findByText('250 XLM')).toBeInTheDocument();
    expect(screen.getByText(/375,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('Marked paid')).toBeInTheDocument();
    // "Completed" is both a timeline row label and the status badge.
    expect(screen.getAllByText('Completed')).toHaveLength(2);
  });

  it('shows the escrow account and its transactions', async () => {
    renderPage();
    expect(await screen.findByText('GESCROWADDRESS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lock tx/ })).toHaveAttribute(
      'href',
      'https://stellar.expert/explorer/testnet/tx/lockhash',
    );
    expect(screen.getByRole('link', { name: /Release tx/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Refund tx/ })).not.toBeInTheDocument();
  });

  it('links both parties to their accounts', async () => {
    renderPage();
    await screen.findByText('Buyer');

    const openUserLinks = screen.getAllByRole('link', { name: /Open user/ });
    expect(openUserLinks[0]).toHaveAttribute('href', '/admin/users/buyer');
    expect(openUserLinks[1]).toHaveAttribute('href', '/admin/users/seller');
  });

  it('shows where the Naira was sent', async () => {
    renderPage();
    expect(await screen.findByText(/Pays into Tunde Bello/)).toBeInTheDocument();
  });

  it('explains a cancellation', async () => {
    api.get.mockImplementation((path) =>
      path === '/admin/trades/trd_1'
        ? Promise.resolve(
            trade({ status: 'CANCELLED', completedAt: null, cancelledAt: '2026-09-01T12:20:00Z', cancelReason: 'PAYMENT_TIMEOUT' }),
          )
        : Promise.resolve({ items: [] }),
    );
    renderPage();
    expect(await screen.findByText(/Payment window expired/)).toBeInTheDocument();
  });

  it('opens the chat read-only', async () => {
    renderPage();
    await screen.findByText('Trade chat');
    expect(screen.queryByPlaceholderText('Type a message…')).not.toBeInTheDocument();
  });

  it('links back to the trade monitor', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: /All trades/ })).toHaveAttribute('href', '/admin/trades');
  });

  it('offers a retry when the trade cannot be loaded', async () => {
    api.get.mockImplementationOnce(() => Promise.reject(new Error('Could not reach Nexlm')));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('250 XLM')).toBeInTheDocument();
  });
});
