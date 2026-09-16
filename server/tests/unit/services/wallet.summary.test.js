import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: { order: { findMany: vi.fn() } } }));
vi.mock('../../../src/stellar/wallet.js', () => ({ getXlmBalance: vi.fn(), getPaymentHistory: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { getPaymentHistory, getXlmBalance } = await import('../../../src/stellar/wallet.js');
const { getActivity, getDepositInfo, getWalletSummary } = await import('../../../src/services/wallet.service.js');

const user = { id: 'usr_1', stellarPublicKey: 'GBVLGXNOVFYV7RI7FTATOXPEPBU5D5CGXVOM4RBHYPBNBGULQJJVUP26' };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.order.findMany.mockResolvedValue([]);
  getXlmBalance.mockResolvedValue({ funded: true, balance: '1000', available: '998.99', minimumBalance: '1' });
});

describe('getWalletSummary', () => {
  it('reports the balance with an explorer link', async () => {
    const summary = await getWalletSummary(user);
    expect(summary).toMatchObject({
      publicKey: user.stellarPublicKey,
      network: 'testnet',
      balance: '1000',
      available: '998.99',
      committedToOrders: '0',
      withdrawable: '998.99',
    });
    expect(summary.explorerUrl).toContain('/explorer/testnet/account/');
  });

  it('subtracts XLM promised to sell orders from what can be withdrawn', async () => {
    prisma.order.findMany.mockResolvedValue([{ xlmAmount: '500' }]);
    const summary = await getWalletSummary(user);
    expect(summary.committedToOrders).toBe('502');
    expect(summary.withdrawable).toBe('496.99');
  });

  it('never reports a negative withdrawable amount', async () => {
    getXlmBalance.mockResolvedValue({ available: '10' });
    prisma.order.findMany.mockResolvedValue([{ xlmAmount: '500' }]);
    expect((await getWalletSummary(user)).withdrawable).toBe('0');
  });
});

describe('getDepositInfo', () => {
  it('returns a QR code for the address', async () => {
    const info = await getDepositInfo(user);
    expect(info.publicKey).toBe(user.stellarPublicKey);
    expect(info.qrCode.startsWith('data:image/png;base64,')).toBe(true);
    expect(info.memoRequired).toBe(false);
  });

  it('warns that testnet XLM is not real money', async () => {
    expect((await getDepositInfo(user)).warning).toContain('TESTNET');
  });
});

describe('getActivity', () => {
  it('adds an explorer link to every entry', async () => {
    getPaymentHistory.mockResolvedValue({ records: [{ id: '1', txHash: 'abc' }], nextCursor: 'p1' });
    const { items, nextCursor } = await getActivity(user, {});
    expect(items[0].explorerUrl).toBe('https://stellar.expert/explorer/testnet/tx/abc');
    expect(nextCursor).toBe('p1');
  });

  it('passes the cursor through for the next page', async () => {
    getPaymentHistory.mockResolvedValue({ records: [], nextCursor: null });
    await getActivity(user, { cursor: 'p1' });
    expect(getPaymentHistory).toHaveBeenCalledWith(user.stellarPublicKey, { cursor: 'p1' });
  });
});
