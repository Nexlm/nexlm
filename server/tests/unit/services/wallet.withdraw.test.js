import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    order: { findMany: vi.fn() },
    transaction: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}));
vi.mock('../../../src/stellar/wallet.js', () => ({ getXlmBalance: vi.fn(), getPaymentHistory: vi.fn() }));
vi.mock('../../../src/stellar/payments.js', () => ({ sendXlm: vi.fn() }));
vi.mock('../../../src/lib/secrets.js', () => ({ decryptSecret: vi.fn(() => 'SSECRET') }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { getXlmBalance } = await import('../../../src/stellar/wallet.js');
const { sendXlm } = await import('../../../src/stellar/payments.js');
const { decryptSecret } = await import('../../../src/lib/secrets.js');
const { listTransactions, withdraw } = await import('../../../src/services/wallet.service.js');

const destination = 'GBVLGXNOVFYV7RI7FTATOXPEPBU5D5CGXVOM4RBHYPBNBGULQJJVUP26';

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue({ id: 'usr_1', stellarPublicKey: 'GME', stellarSecretEnc: 'enc' });
  prisma.order.findMany.mockResolvedValue([]);
  getXlmBalance.mockResolvedValue({ available: '500' });
  sendXlm.mockResolvedValue({ txHash: 'tx-hash' });
});

describe('withdraw', () => {
  it('sends the XLM and records the transaction', async () => {
    const result = await withdraw('usr_1', { destination, amount: '100', memo: 'rent' });

    expect(sendXlm).toHaveBeenCalledWith({ sourceSecret: 'SSECRET', destination, amount: '100', memo: 'rent' });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: { userId: 'usr_1', type: 'WITHDRAWAL', xlmAmount: '100', counterparty: destination, stellarTxHash: 'tx-hash' },
    });
    expect(result).toEqual({ txHash: 'tx-hash', explorerUrl: 'https://stellar.expert/explorer/testnet/tx/tx-hash' });
  });

  it('decrypts the wallet secret only to sign', async () => {
    await withdraw('usr_1', { destination, amount: '1' });
    expect(decryptSecret).toHaveBeenCalledWith('enc');
  });

  it('refuses more than the withdrawable balance and says the limit', async () => {
    await expect(withdraw('usr_1', { destination, amount: '501' })).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      details: { withdrawable: '500' },
    });
    expect(sendXlm).not.toHaveBeenCalled();
  });

  it('counts XLM committed to sell orders as unavailable', async () => {
    prisma.order.findMany.mockResolvedValue([{ xlmAmount: '400' }]);
    await expect(withdraw('usr_1', { destination, amount: '150' })).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
    });
  });

  it('allows withdrawing the exact withdrawable amount', async () => {
    await expect(withdraw('usr_1', { destination, amount: '500' })).resolves.toMatchObject({ txHash: 'tx-hash' });
  });

  it('records nothing when the network rejects the payment', async () => {
    sendXlm.mockRejectedValue(new Error('tx_failed'));
    await expect(withdraw('usr_1', { destination, amount: '10' })).rejects.toThrow('tx_failed');
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });
});

describe('listTransactions', () => {
  it('returns newest first with explorer links and paging', async () => {
    prisma.transaction.findMany.mockResolvedValue([{ id: 'tx1', stellarTxHash: 'abc' }]);
    prisma.transaction.count.mockResolvedValue(1);

    const result = await listTransactions('usr_1', { page: 1, pageSize: 20 });
    expect(prisma.transaction.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
    expect(result.items[0].explorerUrl).toContain('/tx/abc');
    expect(result.pagination.total).toBe(1);
  });
});
