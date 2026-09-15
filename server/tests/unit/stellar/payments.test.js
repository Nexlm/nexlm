import { Account, Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/stellar/client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  horizon: { loadAccount: vi.fn() },
  accountExists: vi.fn(),
  submitTransaction: vi.fn(),
}));

const { accountExists, horizon, submitTransaction } = await import('../../../src/stellar/client.js');
const { sendXlm } = await import('../../../src/stellar/payments.js');

const source = Keypair.random();
const destination = Keypair.random().publicKey();

beforeEach(() => {
  vi.clearAllMocks();
  horizon.loadAccount.mockResolvedValue(new Account(source.publicKey(), '1'));
  accountExists.mockResolvedValue(true);
  submitTransaction.mockResolvedValue({ hash: 'withdraw-hash' });
});

const send = (overrides = {}) =>
  sendXlm({ sourceSecret: source.secret(), destination, amount: '50', ...overrides });

describe('sendXlm', () => {
  it('pays an existing account', async () => {
    expect(await send()).toEqual({ txHash: 'withdraw-hash' });
    const [tx] = submitTransaction.mock.calls[0];
    expect(tx.operations[0]).toMatchObject({ type: 'payment', destination, amount: '50.0000000' });
    expect(tx.signatures).toHaveLength(1);
  });

  it('creates an account that does not exist yet', async () => {
    accountExists.mockResolvedValue(false);
    await send();
    expect(submitTransaction.mock.calls[0][0].operations[0]).toMatchObject({
      type: 'createAccount',
      startingBalance: '50.0000000',
    });
  });

  it('explains that a new account needs at least 1 XLM', async () => {
    accountExists.mockResolvedValue(false);
    await expect(send({ amount: '0.5' })).rejects.toMatchObject({
      status: 400,
      message: 'This address is not activated yet — send at least 1 XLM to create it',
    });
  });

  it('refuses sending to your own wallet', async () => {
    await expect(send({ destination: source.publicKey() })).rejects.toMatchObject({
      status: 400,
      message: 'You cannot send XLM to your own wallet',
    });
  });

  it('attaches an optional memo', async () => {
    await send({ memo: 'rent' });
    expect(submitTransaction.mock.calls[0][0].memo.value.toString()).toBe('rent');
  });

  it('sends no memo when none is given', async () => {
    await send();
    expect(submitTransaction.mock.calls[0][0].memo.value).toBeNull();
  });

  it('wraps Horizon failures', async () => {
    horizon.loadAccount.mockRejectedValue(new Error('ETIMEDOUT'));
    await expect(send()).rejects.toMatchObject({ code: 'HORIZON_UNAVAILABLE' });
  });
});
