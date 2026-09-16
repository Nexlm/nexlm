import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('../../lib/api.js', () => ({ api: { post: vi.fn(), get: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const { api } = await import('../../lib/api.js');
const { useAuthStore } = await import('../../store/authStore.js');
const { TradeModal } = await import('./TradeModal.jsx');

const order = (overrides = {}) => ({
  id: 'ord_1',
  type: 'SELL',
  xlmAmount: '250',
  ngnRate: '1500',
  paymentMethods: ['OPAY'],
  user: { displayName: 'ada', kycStatus: 'VERIFIED' },
  ...overrides,
});

const renderModal = (overrides) =>
  render(
    <MemoryRouter>
      <TradeModal order={order(overrides)} onClose={vi.fn()} />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: 'tok', user: { id: 'usr_1', role: 'USER' } });
});

describe('TradeModal', () => {
  it('shows the price, amount and what the taker pays', () => {
    renderModal();
    expect(screen.getByText('You pay')).toBeInTheDocument();
    expect(screen.getByText(/375,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('250 XLM')).toBeInTheDocument();
  });

  it('says what the taker receives on a buy order', () => {
    renderModal({ type: 'BUY' });
    expect(screen.getByText('You receive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sell 250 XLM$/ })).toBeInTheDocument();
  });

  it('explains how escrow protects the taker', () => {
    renderModal();
    expect(screen.getByText(/locked in a Stellar escrow account before you pay/)).toBeInTheDocument();
  });

  it('shows a single payment method as text and several as a choice', () => {
    const { unmount } = renderModal();
    expect(screen.queryByLabelText('Payment method')).not.toBeInTheDocument();
    expect(screen.getByText('OPay')).toBeInTheDocument();
    unmount();

    renderModal({ paymentMethods: ['OPAY', 'KUDA'] });
    expect(screen.getByLabelText('Payment method')).toBeInTheDocument();
  });

  it('shows advertiser terms when there are any', () => {
    renderModal({ terms: 'Pay within 10 minutes.' });
    expect(screen.getByText('Pay within 10 minutes.')).toBeInTheDocument();
  });

  it('opens the trade and goes to the trade room', async () => {
    api.post.mockResolvedValue({ id: 'trd_1' });
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: /^Buy 250 XLM$/ }));
    expect(api.post).toHaveBeenCalledWith('/trades', { orderId: 'ord_1', paymentMethod: 'OPAY' });
    expect(navigate).toHaveBeenCalledWith('/trades/trd_1');
  });

  it('sends logged-out visitors to log in instead of trading', async () => {
    useAuthStore.setState({ token: null, user: null });
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Log in to trade' }));
    expect(api.post).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login?next=%2F');
  });

  it('turns a blocked trade into a link that fixes it', async () => {
    api.post.mockRejectedValue({ code: 'KYC_REQUIRED', message: 'Complete identity verification before trading.' });
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: /^Buy 250 XLM$/ }));
    expect(await screen.findByText('Complete identity verification before trading.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verify identity' })).toHaveAttribute('href', '/kyc');
  });

  it('shows plain errors with no action link', async () => {
    api.post.mockRejectedValue({ code: 'CONFLICT', message: 'Another trader just took this order' });
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: /^Buy 250 XLM$/ }));
    expect(await screen.findByText('Another trader just took this order')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Verify|Deposit|Add payout/ })).not.toBeInTheDocument();
  });
});
