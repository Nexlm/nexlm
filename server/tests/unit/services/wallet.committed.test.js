import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: { order: { findMany: vi.fn() } } }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { committedToSellOrders } = await import('../../../src/services/wallet.service.js');

beforeEach(() => vi.clearAllMocks());

describe('committedToSellOrders', () => {
  it('is zero with no active sell orders', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    expect(await committedToSellOrders('usr_1')).toBe('0');
  });

  it('reserves the escrow overhead for every order', async () => {
    prisma.order.findMany.mockResolvedValue([{ xlmAmount: '250' }]);
    expect(await committedToSellOrders('usr_1')).toBe('252');
  });

  it('adds up several orders', async () => {
    prisma.order.findMany.mockResolvedValue([{ xlmAmount: '250' }, { xlmAmount: '10.5' }]);
    expect(await committedToSellOrders('usr_1')).toBe('264.5');
  });

  it('ignores buy orders, closed orders and expired ones', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    await committedToSellOrders('usr_1');
    const { where } = prisma.order.findMany.mock.calls[0][0];
    expect(where).toMatchObject({ userId: 'usr_1', type: 'SELL', status: 'ACTIVE' });
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
  });
});
