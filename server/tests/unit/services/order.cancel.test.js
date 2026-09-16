import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: { order: { findUnique: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock('../../../src/socket/io.js', () => ({ broadcast: vi.fn() }));
vi.mock('../../../src/stellar/wallet.js', () => ({ getXlmBalance: vi.fn() }));
vi.mock('../../../src/services/wallet.service.js', () => ({ committedToSellOrders: vi.fn() }));
vi.mock('../../../src/services/reputation.service.js', () => ({ withUserStats: vi.fn(async (items) => items) }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { broadcast } = await import('../../../src/socket/io.js');
const { cancelOrder } = await import('../../../src/services/order.service.js');

const future = new Date(Date.now() + 600_000);
const order = (overrides = {}) => ({ userId: 'usr_1', status: 'ACTIVE', expiresAt: future, ...overrides });

beforeEach(() => {
  vi.clearAllMocks();
  prisma.order.findUnique.mockResolvedValue(order());
  prisma.order.updateMany.mockResolvedValue({ count: 1 });
});

describe('cancelOrder', () => {
  it('cancels an active order and removes it from the market', async () => {
    await cancelOrder('usr_1', 'ord_1');
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
    expect(broadcast).toHaveBeenCalledWith('order:removed', { id: 'ord_1' });
  });

  it('404s for unknown orders', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(cancelOrder('usr_1', 'nope')).rejects.toMatchObject({ status: 404 });
  });

  it('only lets the owner cancel', async () => {
    await expect(cancelOrder('someone-else', 'ord_1')).rejects.toMatchObject({
      status: 403,
      message: 'You can only cancel your own orders',
    });
  });

  it('refuses orders that are already closed or expired', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ status: 'FILLED' }));
    await expect(cancelOrder('usr_1', 'ord_1')).rejects.toMatchObject({ status: 409 });

    prisma.order.findUnique.mockResolvedValue(order({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(cancelOrder('usr_1', 'ord_1')).rejects.toMatchObject({ status: 409 });
  });

  it('loses the race to a trade that was just opened', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(cancelOrder('usr_1', 'ord_1')).rejects.toMatchObject({
      status: 409,
      message: 'This order was just matched and can no longer be cancelled',
    });
    expect(broadcast).not.toHaveBeenCalled();
  });
});
