import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: { trade: { groupBy: vi.fn() } } }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { getTradeStats, getUserTradeStats, withUserStats } = await import(
  '../../../src/services/reputation.service.js'
);

beforeEach(() => vi.clearAllMocks());

const mockGroups = (buyerRows, sellerRows) => {
  prisma.trade.groupBy.mockResolvedValueOnce(buyerRows).mockResolvedValueOnce(sellerRows);
};

describe('getTradeStats', () => {
  it('skips the query when there are no users', async () => {
    expect((await getTradeStats([])).size).toBe(0);
    expect(prisma.trade.groupBy).not.toHaveBeenCalled();
  });

  it('combines buy-side and sell-side history', async () => {
    mockGroups(
      [{ buyerId: 'ada', status: 'COMPLETED', _count: { _all: 3 } }],
      [
        { sellerId: 'ada', status: 'COMPLETED', _count: { _all: 1 } },
        { sellerId: 'ada', status: 'CANCELLED', _count: { _all: 1 } },
      ],
    );
    expect((await getTradeStats(['ada'])).get('ada')).toEqual({ completedTrades: 4, completionRate: 80 });
  });

  it('deduplicates user ids', async () => {
    mockGroups([], []);
    await getTradeStats(['ada', 'ada']);
    expect(prisma.trade.groupBy.mock.calls[0][0].where.buyerId.in).toEqual(['ada']);
  });

  it('only counts closed trades', async () => {
    mockGroups([], []);
    await getTradeStats(['ada']);
    expect(prisma.trade.groupBy.mock.calls[0][0].where.status).toEqual({ in: ['COMPLETED', 'CANCELLED'] });
  });
});

describe('getUserTradeStats', () => {
  it('returns one user’s stats', async () => {
    mockGroups([{ buyerId: 'ada', status: 'COMPLETED', _count: { _all: 2 } }], []);
    expect(await getUserTradeStats('ada')).toEqual({ completedTrades: 2, completionRate: 100 });
  });
});

describe('withUserStats', () => {
  it('attaches stats to the nested user of each item', async () => {
    mockGroups([{ buyerId: 'u1', status: 'COMPLETED', _count: { _all: 5 } }], []);
    const [order] = await withUserStats([{ id: 'o1', user: { id: 'u1', displayName: 'ada' } }]);
    expect(order).toEqual({ id: 'o1', user: { id: 'u1', displayName: 'ada', stats: { completedTrades: 5, completionRate: 100 } } });
  });
});
