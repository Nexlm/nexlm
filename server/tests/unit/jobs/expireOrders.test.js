import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: { order: { findMany: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock('../../../src/socket/io.js', () => ({ broadcast: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { broadcast } = await import('../../../src/socket/io.js');
const { expireOrders } = await import('../../../src/jobs/expireOrders.js');

beforeEach(() => vi.clearAllMocks());

describe('expireOrders', () => {
  it('does nothing when no orders are due', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    expect(await expireOrders()).toBe(0);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('expires due orders and tells the market to drop them', async () => {
    prisma.order.findMany.mockResolvedValue([{ id: 'o1' }, { id: 'o2' }]);
    prisma.order.updateMany.mockResolvedValue({ count: 2 });

    expect(await expireOrders()).toBe(2);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['o1', 'o2'] }, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });
    expect(broadcast).toHaveBeenCalledWith('order:removed', { id: 'o1' });
    expect(broadcast).toHaveBeenCalledWith('order:removed', { id: 'o2' });
  });

  it('only looks at active orders past their expiry', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    const now = new Date('2026-09-01T12:00:00Z');
    await expireOrders(now);
    expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({ status: 'ACTIVE', expiresAt: { lte: now } });
  });
});
