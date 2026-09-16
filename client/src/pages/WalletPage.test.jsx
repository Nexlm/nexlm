import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  setAuthHandlers: vi.fn(),
}));

const { api } = await import('../lib/api.js');
const { useAuthStore } = await import('../store/authStore.js');
const WalletPage = (await import('./WalletPage.jsx')).default;

const wallet = (overrides = {}) => ({
  publicKey: 'GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH',
  network: 'testnet',
  explorerUrl: 'https://stellar.expert/explorer/testnet/account/GA6HCM',
  funded: true,
  balance: '1000.5',
  available: '998.5',
  committedToOrders: '252',
  withdrawable: '746.5',
  minimumBalance: '1',
  ...overrides,
});

const answer = (path) => {
  if (path === '/wallet') return Promise.resolve(wallet());
  if (path === '/wallet/deposit') {
    return Promise.resolve({ publicKey: wallet().publicKey, network: 'testnet', qrCode: 'data:image/png;base64,abc', warning: 'This is a TESTNET wallet.' });
  }
  return Promise.resolve({ items: [], nextCursor: null });
};

const renderPage = () => render(<MemoryRouter><WalletPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: 'tok', user: { id: 'usr_1', emailVerified: true } });
  api.get.mockImplementation(answer);
});

describe('WalletPage', () => {
  it('shows the balance and links the address to the explorer', async () => {
    renderPage();
    await screen.findByText(/Stellar wallet/);

    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /GA6HCM/ })).toHaveAttribute(
      'href',
      'https://stellar.expert/explorer/testnet/account/GA6HCM',
    );
  });

  it('marks a testnet wallet', async () => {
    renderPage();
    expect(await screen.findByText('Testnet')).toBeInTheDocument();
  });

  it('breaks the balance down, including XLM held for sell orders', async () => {
    renderPage();
    await screen.findByText('In sell orders');
    expect(screen.getByText('252 XLM')).toBeInTheDocument();
    expect(screen.getByText('746.5 XLM')).toBeInTheDocument();
    expect(screen.getByText('Amount + 2 XLM escrow each')).toBeInTheDocument();
  });

  it('warns when the account is not activated', async () => {
    api.get.mockImplementation((path) => (path === '/wallet' ? Promise.resolve(wallet({ funded: false })) : answer(path)));
    renderPage();
    expect(await screen.findByText('Wallet not activated yet')).toBeInTheDocument();
  });

  it('opens on the deposit address', async () => {
    renderPage();
    expect(await screen.findByAltText('Deposit address QR code')).toBeInTheDocument();
  });

  it('switches to withdrawing', async () => {
    renderPage();
    await screen.findByAltText('Deposit address QR code');

    await userEvent.click(screen.getByRole('tab', { name: 'Withdraw' }));
    expect(await screen.findByLabelText('Destination address')).toBeInTheDocument();
  });

  it('blocks withdrawals until the email is verified', async () => {
    useAuthStore.setState({ user: { id: 'usr_1', emailVerified: false } });
    renderPage();
    await screen.findByAltText('Deposit address QR code');

    await userEvent.click(screen.getByRole('tab', { name: 'Withdraw' }));
    expect(await screen.findByText('Verify your email address before withdrawing.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Destination address')).not.toBeInTheDocument();
  });

  it('refreshes the balance on demand', async () => {
    renderPage();
    await screen.findByText('In sell orders');

    const before = api.get.mock.calls.filter((c) => c[0] === '/wallet').length;
    await userEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    await waitFor(() =>
      expect(api.get.mock.calls.filter((c) => c[0] === '/wallet').length).toBeGreaterThan(before),
    );
  });

  it('offers a retry when the wallet cannot be loaded', async () => {
    api.get.mockImplementationOnce(() => Promise.reject(new Error('Could not reach Nexlm')));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('In sell orders')).toBeInTheDocument());
  });
});
