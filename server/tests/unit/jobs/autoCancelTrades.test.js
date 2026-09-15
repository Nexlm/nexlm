import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: { trade: { findMany: vi.fn() } } }));
vi.mock('../../../src/services/trade.service.js', () => ({ expireTrade: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { expireTrade } = await import('../../../src/services/trade.service.js');
const { autoCancelTrades } = await import('../../../src/jobs/autoCancelTrades.js');

beforeEach(() => vi.clearAllMocks());

describe('autoCancelTrades', () => {
  it('refunds every overdue trade', async () => {
    prisma.trade.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    expireTrade.mockResolvedValue(true);
    expect(await autoCancelTrades()).toBe(2);
  });

  it('does not count trades that were already settled', async () => {
    prisma.trade.findMany.mockResolvedValue([{ id: 't1' }]);
    expireTrade.mockResolvedValue(false);
    expect(await autoCancelTrades()).toBe(0);
  });

  it('keeps going when one refund fails, leaving it for the next tick', async () => {
    prisma.trade.findMany.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    expireTrade.mockRejectedValueOnce(new Error('Horizon down')).mockResolvedValueOnce(true);
    expect(await autoCancelTrades()).toBe(1);
  });

  it('takes the oldest locked trades first', async () => {
    prisma.trade.findMany.mockResolvedValue([]);
    const now = new Date('2026-09-01T12:00:00Z');
    await autoCancelTrades(now);
    expect(prisma.trade.findMany.mock.calls[0][0]).toMatchObject({
      where: { status: 'ESCROW_LOCKED', paymentDeadline: { lte: now } },
      orderBy: { paymentDeadline: 'asc' },
    });
  });
});
