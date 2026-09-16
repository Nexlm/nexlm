import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { post: vi.fn(), get: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../../lib/api.js');
const { useToastStore } = await import('../../store/toastStore.js');
const { WithdrawForm } = await import('./WithdrawForm.jsx');

const destination = 'GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH';

const fill = async ({ address = destination, amount = '50' } = {}) => {
  await userEvent.type(screen.getByLabelText('Destination address'), address);
  await userEvent.type(screen.getByLabelText('Amount'), amount);
  await userEvent.click(screen.getByRole('button', { name: 'Review withdrawal' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
});

describe('WithdrawForm validation', () => {
  it('rejects an address that is not a Stellar public key', async () => {
    render(<WithdrawForm withdrawable="500" />);
    await fill({ address: 'not-an-address' });
    expect(screen.getByText('Enter a valid Stellar address (starts with G)')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requires an amount', async () => {
    render(<WithdrawForm withdrawable="500" />);
    await fill({ amount: '0' });
    expect(screen.getByText('Enter an amount')).toBeInTheDocument();
  });

  it('refuses more than the withdrawable balance', async () => {
    render(<WithdrawForm withdrawable="500" />);
    await fill({ amount: '600' });
    expect(screen.getByText('You can withdraw up to 500 XLM')).toBeInTheDocument();
  });

  it('fills in the maximum on request', async () => {
    render(<WithdrawForm withdrawable="500" />);
    await userEvent.click(screen.getByRole('button', { name: 'Max 500 XLM' }));
    expect(screen.getByLabelText('Amount')).toHaveValue('500');
  });
});

describe('WithdrawForm confirmation', () => {
  it('asks for confirmation before sending, showing the irreversibility warning', async () => {
    render(<WithdrawForm withdrawable="500" />);
    await fill();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Stellar payments are irreversible/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sends the withdrawal and links to the transaction', async () => {
    api.post.mockResolvedValue({ txHash: 'abc', explorerUrl: 'https://stellar.expert/explorer/testnet/tx/abc' });
    const onDone = vi.fn();
    render(<WithdrawForm withdrawable="500" onDone={onDone} />);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: /^Send/ }));

    expect(api.post).toHaveBeenCalledWith('/wallet/withdraw', { destination, amount: '50', memo: undefined });
    expect(await screen.findByText('Withdrawal submitted')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View on Stellar Expert/ })).toHaveAttribute(
      'href',
      'https://stellar.expert/explorer/testnet/tx/abc',
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('can be backed out of', async () => {
    render(<WithdrawForm withdrawable="500" />);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows server validation errors on the right field', async () => {
    api.post.mockRejectedValue({
      message: 'Invalid request',
      details: [{ path: 'destination', message: 'This account is not activated yet' }],
    });
    render(<WithdrawForm withdrawable="500" />);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: /^Send/ }));

    expect(await screen.findByText('This account is not activated yet')).toBeInTheDocument();
    expect(useToastStore.getState().toasts[0]).toMatchObject({ tone: 'error' });
  });
});
