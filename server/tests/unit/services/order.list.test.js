import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: { order: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() } },
}));
vi.mock('../../../src/socket/io.js', () => ({ broadcast: vi.fn() }));
vi.mock('../../../src/stellar/wallet.js', () => ({ getXlmBalance: vi.fn() }));
vi.mock('../../../src/services/wallet.service.js', () => ({ committedToSellOrders: vi.fn() }));
vi.mock('../../../src/services/reputation.service.js', () => ({ withUserStats: vi.fn(async (items) => items) }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { withUserStats } = await import('../../../src/services/reputation.service.js');
const { getOrder, listMyOrders, listOrders } = await import('../../../src/services/order.service.js');

beforeEach(() => {
  vi.clearAllMocks();
  prisma.order.findMany.mockResolvedValue([]);
  prisma.order.count.mockResolvedValue(0);
});

describe('listOrders', () => {
  it('sorts sell offers cheapest first', async () => {
    await listOrders({ type: 'SELL', page: 1, pageSize: 20 });
    expect(prisma.order.findMany.mock.calls[0][0].orderBy).toEqual([{ ngnRate: 'asc' }, { createdAt: 'asc' }]);
  });

  it('sorts buy offers highest bid first', async () => {
    await listOrders({ type: 'BUY', page: 1, pageSize: 20 });
    expect(prisma.order.findMany.mock.calls[0][0].orderBy).toEqual([{ ngnRate: 'desc' }, { createdAt: 'asc' }]);
  });

  it('hides expired offers and offers from restricted traders', async () => {
    await listOrders({ type: 'SELL', page: 1, pageSize: 20 });
    const { where } = prisma.order.findMany.mock.calls[0][0];
    expect(where.status).toBe('ACTIVE');
    expect(where.user).toEqual({ status: 'ACTIVE' });
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
  });

  it('applies payment method and minimum amount filters', async () => {
    await listOrders({ type: 'SELL', paymentMethod: 'KUDA', minAmount: '100', page: 1, pageSize: 20 });
    const { where } = prisma.order.findMany.mock.calls[0][0];
    expect(where.paymentMethods).toEqual({ has: 'KUDA' });
    expect(where.xlmAmount).toEqual({ gte: '100' });
  });

  it('returns pagination metadata and trader stats', async () => {
    prisma.order.findMany.mockResolvedValue([{ id: 'o1' }]);
    prisma.order.count.mockResolvedValue(45);
    const result = await listOrders({ type: 'SELL', page: 2, pageSize: 20 });
    expect(result.pagination).toEqual({ page: 2, pageSize: 20, total: 45, totalPages: 3, hasMore: true });
    expect(withUserStats).toHaveBeenCalled();
  });
});

describe('getOrder', () => {
  it('returns the order with trader stats', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'o1' });
    expect(await getOrder('o1')).toMatchObject({ id: 'o1' });
  });

  it('404s for unknown orders', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(getOrder('nope')).rejects.toMatchObject({ status: 404 });
  });
});

describe('listMyOrders', () => {
  it('shows newest first and includes the trade count', async () => {
    await listMyOrders('usr_1', { page: 1, pageSize: 20 });
    const args = prisma.order.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 'usr_1' });
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    expect(args.include._count.select.trades).toBe(true);
  });

  it('filters by status', async () => {
    await listMyOrders('usr_1', { status: 'EXPIRED', page: 1, pageSize: 20 });
    expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({ userId: 'usr_1', status: 'EXPIRED' });
  });
});
