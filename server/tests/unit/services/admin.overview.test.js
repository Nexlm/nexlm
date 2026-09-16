import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    trade: { count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
    order: { count: vi.fn(), updateMany: vi.fn() },
    paymentAccount: { findMany: vi.fn() },
  },
}));
vi.mock('../../../src/services/reputation.service.js', () => ({ getUserTradeStats: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { getOverview, listTrades } = await import('../../../src/services/admin.service.js');

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.count.mockResolvedValue(120);
  prisma.trade.count.mockResolvedValue(9);
  prisma.trade.aggregate.mockResolvedValue({ _sum: { ngnAmount: '5000000.00', xlmAmount: '3200' } });
  prisma.order.count.mockResolvedValue(14);
  prisma.trade.findMany.mockResolvedValue([]);
});

describe('getOverview', () => {
  it('summarises users, trades, volume and open orders', async () => {
    const overview = await getOverview();
    expect(overview).toMatchObject({
      users: { total: 120, verified: 120, pendingKyc: 120 },
      trades: { active: 9, completed30d: 9, cancelled30d: 9, completionRate30d: 50 },
      volume30d: { ngn: '5000000.00', xlm: '3200' },
      activeOrders: 14,
    });
  });

  it('shows no completion rate before any trade closes', async () => {
    prisma.trade.count.mockResolvedValue(0);
    expect((await getOverview()).trades.completionRate30d).toBeNull();
  });

  it('reports zero volume when nothing completed', async () => {
    prisma.trade.aggregate.mockResolvedValue({ _sum: { ngnAmount: null, xlmAmount: null } });
    expect((await getOverview()).volume30d).toEqual({ ngn: '0', xlm: '0' });
  });

  it('measures the last 30 days', async () => {
    await getOverview();
    const completedQuery = prisma.trade.count.mock.calls.find((c) => c[0]?.where?.status === 'COMPLETED');
    const since = completedQuery[0].where.completedAt.gte;
    expect(Date.now() - since.getTime()).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -4);
  });
});

describe('listTrades', () => {
  it('shows the most recently updated trades with both parties', async () => {
    prisma.trade.count.mockResolvedValue(0);
    await listTrades({ page: 1, pageSize: 20 });
    const args = prisma.trade.findMany.mock.calls[0][0];
    expect(args.where).toEqual({});
    expect(args.orderBy).toEqual({ updatedAt: 'desc' });
    expect(args.include.buyer.select.displayName).toBe(true);
  });

  it('filters by status', async () => {
    prisma.trade.count.mockResolvedValue(0);
    await listTrades({ status: 'PAID', page: 1, pageSize: 20 });
    expect(prisma.trade.findMany.mock.calls[0][0].where).toEqual({ status: 'PAID' });
  });
});
