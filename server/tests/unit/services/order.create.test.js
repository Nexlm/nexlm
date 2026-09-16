import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    order: { count: vi.fn(), create: vi.fn() },
    paymentAccount: { findMany: vi.fn() },
  },
}));
vi.mock('../../../src/socket/io.js', () => ({ broadcast: vi.fn() }));
vi.mock('../../../src/stellar/wallet.js', () => ({ getXlmBalance: vi.fn() }));
vi.mock('../../../src/services/wallet.service.js', () => ({ committedToSellOrders: vi.fn() }));
vi.mock('../../../src/services/reputation.service.js', () => ({ withUserStats: vi.fn(async (items) => items) }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { broadcast } = await import('../../../src/socket/io.js');
const { getXlmBalance } = await import('../../../src/stellar/wallet.js');
const { committedToSellOrders } = await import('../../../src/services/wallet.service.js');
const { createOrder } = await import('../../../src/services/order.service.js');

const user = { id: 'usr_1', stellarPublicKey: 'GSELLER' };
const sellOrder = { type: 'SELL', xlmAmount: '250', ngnRate: '1500', paymentMethods: ['OPAY'], terms: undefined };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.order.count.mockResolvedValue(0);
  prisma.order.create.mockImplementation(async ({ data }) => ({ id: 'ord_1', ...data }));
  prisma.paymentAccount.findMany.mockResolvedValue([{ method: 'OPAY' }]);
  getXlmBalance.mockResolvedValue({ available: '1000' });
  committedToSellOrders.mockResolvedValue('0');
});

describe('createOrder', () => {
  it('creates a sell order with an expiry and announces it', async () => {
    const order = await createOrder(user, sellOrder);
    expect(order).toMatchObject({ id: 'ord_1', type: 'SELL', xlmAmount: '250' });
    expect(prisma.order.create.mock.calls[0][0].data.expiresAt).toBeInstanceOf(Date);
    expect(broadcast).toHaveBeenCalledWith('order:created', { id: 'ord_1', type: 'SELL' });
  });

  it('rejects orders below the minimum and above the maximum', async () => {
    await expect(createOrder(user, { ...sellOrder, xlmAmount: '5' })).rejects.toMatchObject({
      code: 'ORDER_SIZE_OUT_OF_RANGE',
    });
    await expect(createOrder(user, { ...sellOrder, xlmAmount: '200000' })).rejects.toMatchObject({
      code: 'ORDER_SIZE_OUT_OF_RANGE',
    });
  });

  it('caps how many orders can be open at once', async () => {
    prisma.order.count.mockResolvedValue(10);
    await expect(createOrder(user, sellOrder)).rejects.toMatchObject({ code: 'TOO_MANY_ORDERS' });
  });

  it('requires a payout account for each payment method offered', async () => {
    prisma.paymentAccount.findMany.mockResolvedValue([]);
    await expect(createOrder(user, sellOrder)).rejects.toMatchObject({
      code: 'PAYMENT_ACCOUNT_REQUIRED',
      details: { missing: ['OPAY'] },
    });
  });

  it('requires enough XLM for the amount plus escrow overhead', async () => {
    getXlmBalance.mockResolvedValue({ available: '251' });
    await expect(createOrder(user, sellOrder)).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });

    getXlmBalance.mockResolvedValue({ available: '252' });
    await expect(createOrder(user, sellOrder)).resolves.toBeTruthy();
  });

  it('counts XLM already committed to other sell orders', async () => {
    getXlmBalance.mockResolvedValue({ available: '300' });
    committedToSellOrders.mockResolvedValue('100');
    await expect(createOrder(user, sellOrder)).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      details: { committed: '100' },
    });
  });

  it('does not check balances or payout accounts for buy orders', async () => {
    await createOrder(user, { ...sellOrder, type: 'BUY' });
    expect(getXlmBalance).not.toHaveBeenCalled();
    expect(prisma.paymentAccount.findMany).not.toHaveBeenCalled();
  });
});
