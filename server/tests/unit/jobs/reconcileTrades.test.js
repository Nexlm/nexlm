import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: { trade: { findMany: vi.fn() } } }));
vi.mock('../../../src/services/trade.service.js', () => ({ reconcileTrade: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { reconcileTrade } = await import('../../../src/services/trade.service.js');
const { reconcileTrades } = await import('../../../src/jobs/reconcileTrades.js');

beforeEach(() => vi.clearAllMocks());

describe('reconcileTrades', () => {
  it('only looks at transitional trades that stopped changing', async () => {
    prisma.trade.findMany.mockResolvedValue([]);
    const now = new Date('2026-09-01T12:00:00Z');
    await reconcileTrades(now);

    const { where } = prisma.trade.findMany.mock.calls[0][0];
    expect(where.status).toEqual({ in: ['PENDING_ESCROW', 'RELEASING', 'REFUNDING'] });
    expect(where.updatedAt.lte).toEqual(new Date('2026-09-01T11:58:00Z'));
  });

  it('counts the trades it settles', async () => {
    prisma.trade.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    reconcileTrade.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await reconcileTrades()).toBe(1);
  });

  it('survives a failing reconciliation', async () => {
    prisma.trade.findMany.mockResolvedValue([{ id: 't1' }]);
    reconcileTrade.mockRejectedValue(new Error('Horizon down'));
    await expect(reconcileTrades()).resolves.toBe(0);
  });
});
