import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const { api } = await import('../lib/api.js');
const { useToastStore } = await import('../store/toastStore.js');
const CreateOrderPage = (await import('./CreateOrderPage.jsx')).default;

const renderPage = () => render(<MemoryRouter><CreateOrderPage /></MemoryRouter>);

const answer = (path) => {
  if (path === '/wallet') return Promise.resolve({ withdrawable: '980' });
  if (path === '/users/me/payment-accounts') return Promise.resolve({ items: [{ id: 'pa_1', method: 'OPAY' }] });
  return Promise.resolve({ items: [{ id: 'ord_1', ngnRate: '1500' }] });
};

const fillOrder = async () => {
  await userEvent.type(screen.getByLabelText('Amount'), '250');
  await userEvent.type(screen.getByLabelText('Your price'), '1500');
  await userEvent.click(screen.getByRole('button', { name: 'OPay' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  api.get.mockImplementation(answer);
});

describe('CreateOrderPage', () => {
  it('defaults to selling XLM and says how long orders live', async () => {
    renderPage();
    expect(await screen.findByText(/stay on the market for 30 minutes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post sell order' })).toBeInTheDocument();
  });

  it('shows the current best ask as a reference price', async () => {
    renderPage();
    expect(await screen.findByText(/Best ask right now/)).toBeInTheDocument();
  });

  it('totals the Naira as you type', async () => {
    renderPage();
    await screen.findByLabelText('Amount');

    await userEvent.type(screen.getByLabelText('Amount'), '250');
    await userEvent.type(screen.getByLabelText('Your price'), '1500');
    expect(screen.getByText(/375,000\.00/)).toBeInTheDocument();
  });

  it('explains the refundable escrow reserve to sellers', async () => {
    renderPage();
    expect(await screen.findByText(/2 XLM · refunded/)).toBeInTheDocument();
  });

  it('switches to a buy order', async () => {
    renderPage();
    await screen.findByLabelText('Amount');

    await userEvent.click(screen.getByRole('tab', { name: 'I want to buy XLM' }));
    expect(screen.getByRole('button', { name: 'Post buy order' })).toBeInTheDocument();
    expect(screen.getByText('You will pay')).toBeInTheDocument();
  });

  it('toggles payment methods on and off', async () => {
    renderPage();
    await screen.findByLabelText('Amount');

    const opay = screen.getByRole('button', { name: 'OPay' });
    await userEvent.click(opay);
    expect(opay).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(opay);
    expect(opay).toHaveAttribute('aria-pressed', 'false');
  });

  it('points sellers at settings for rails with no payout account', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'add one in settings' })).toHaveAttribute('href', '/settings');
  });

  it('posts the order and goes to your orders', async () => {
    api.post.mockResolvedValue({ id: 'ord_2' });
    renderPage();
    await screen.findByLabelText('Amount');

    await fillOrder();
    await userEvent.click(screen.getByRole('button', { name: 'Post sell order' }));

    expect(api.post).toHaveBeenCalledWith('/orders', {
      type: 'SELL',
      xlmAmount: '250',
      ngnRate: '1500',
      paymentMethods: ['OPAY'],
      terms: undefined,
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/orders'));
  });

  it('shows field errors from the server', async () => {
    api.post.mockRejectedValue({
      message: 'Invalid request',
      details: [{ path: 'xlmAmount', message: 'Order size must be between 10 and 100000 XLM' }],
    });
    renderPage();
    await screen.findByLabelText('Amount');

    await fillOrder();
    await userEvent.click(screen.getByRole('button', { name: 'Post sell order' }));

    expect(await screen.findByText('Order size must be between 10 and 100000 XLM')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a whole-form error when no field is named', async () => {
    api.post.mockRejectedValue({ code: 'INSUFFICIENT_BALANCE', message: 'Insufficient XLM for this order' });
    renderPage();
    await screen.findByLabelText('Amount');

    await fillOrder();
    await userEvent.click(screen.getByRole('button', { name: 'Post sell order' }));
    expect(await screen.findByText('Insufficient XLM for this order')).toBeInTheDocument();
  });
});
