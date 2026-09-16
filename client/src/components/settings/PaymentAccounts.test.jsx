import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  setAuthHandlers: vi.fn(),
}));

const { api } = await import('../../lib/api.js');
const { useToastStore } = await import('../../store/toastStore.js');
const { PaymentAccounts } = await import('./PaymentAccounts.jsx');

const bankAccount = {
  id: 'pa_1',
  method: 'BANK_TRANSFER',
  bankName: 'GTBank',
  accountName: 'Ada Obi',
  accountNumber: '0123456789',
};

const openForm = async () => userEvent.click(await screen.findByRole('button', { name: /Add/ }));

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  api.get.mockResolvedValue({ items: [] });
  api.post.mockResolvedValue({});
  api.delete.mockResolvedValue(null);
});

describe('PaymentAccounts list', () => {
  it('explains why payout accounts matter when there are none', async () => {
    render(<PaymentAccounts />);
    expect(await screen.findByText('No payout accounts')).toBeInTheDocument();
  });

  it('lists saved accounts with bank and number', async () => {
    api.get.mockResolvedValue({ items: [bankAccount] });
    render(<PaymentAccounts />);

    expect(await screen.findByText(/Bank Transfer/)).toBeInTheDocument();
    expect(screen.getByText(/GTBank/)).toBeInTheDocument();
    expect(screen.getByText('0123456789')).toBeInTheDocument();
  });

  it('removes an account and refreshes the list', async () => {
    api.get.mockResolvedValue({ items: [bankAccount] });
    render(<PaymentAccounts />);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove account' }));
    expect(api.delete).toHaveBeenCalledWith('/users/me/payment-accounts/pa_1');
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('reports a failed removal', async () => {
    api.get.mockResolvedValue({ items: [bankAccount] });
    api.delete.mockRejectedValue(new Error('Account is in use'));
    render(<PaymentAccounts />);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove account' }));
    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({ tone: 'error', message: 'Account is in use' }),
    );
  });
});

describe('adding an account', () => {
  it('asks for a bank name only for bank transfers', async () => {
    render(<PaymentAccounts />);
    await openForm();

    expect(screen.getByLabelText('Bank name')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Method'), 'OPAY');
    expect(screen.queryByLabelText('Bank name')).not.toBeInTheDocument();
  });

  it('saves a mobile wallet without a bank name', async () => {
    render(<PaymentAccounts />);
    await openForm();

    await userEvent.selectOptions(screen.getByLabelText('Method'), 'OPAY');
    await userEvent.type(screen.getByLabelText('Account name'), 'Ada Obi');
    await userEvent.type(screen.getByLabelText('Account number'), '8031234567');
    await userEvent.click(screen.getByRole('button', { name: 'Save account' }));

    expect(api.post).toHaveBeenCalledWith('/users/me/payment-accounts', {
      method: 'OPAY',
      bankName: undefined,
      accountName: 'Ada Obi',
      accountNumber: '8031234567',
    });
    await waitFor(() => expect(useToastStore.getState().toasts[0]).toMatchObject({ tone: 'success' }));
  });

  it('closes the form after saving', async () => {
    render(<PaymentAccounts />);
    await openForm();
    await userEvent.type(screen.getByLabelText('Account name'), 'Ada Obi');
    await userEvent.type(screen.getByLabelText('Account number'), '0123456789');
    await userEvent.click(screen.getByRole('button', { name: 'Save account' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save account' })).not.toBeInTheDocument());
  });

  it('shows server validation errors next to the field', async () => {
    api.post.mockRejectedValue({
      message: 'Invalid request',
      details: [{ path: 'accountNumber', message: 'Account number must be 10 digits' }],
    });
    render(<PaymentAccounts />);
    await openForm();

    await userEvent.type(screen.getByLabelText('Account name'), 'Ada Obi');
    await userEvent.type(screen.getByLabelText('Account number'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Save account' }));

    expect(await screen.findByText('Account number must be 10 digits')).toBeInTheDocument();
  });

  it('falls back to a toast when the error has no field', async () => {
    api.post.mockRejectedValue(new Error('You already saved this account'));
    render(<PaymentAccounts />);
    await openForm();

    await userEvent.type(screen.getByLabelText('Account name'), 'Ada Obi');
    await userEvent.type(screen.getByLabelText('Account number'), '0123456789');
    await userEvent.click(screen.getByRole('button', { name: 'Save account' }));

    await waitFor(() =>
      expect(useToastStore.getState().toasts[0]).toMatchObject({ message: 'You already saved this account' }),
    );
  });

  it('can be dismissed', async () => {
    render(<PaymentAccounts />);
    await openForm();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Account name')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
