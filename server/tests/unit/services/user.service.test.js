import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    order: { findMany: vi.fn() },
    paymentAccount: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock('../../../src/services/reputation.service.js', () => ({ getUserTradeStats: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { getUserTradeStats } = await import('../../../src/services/reputation.service.js');
const { addPaymentAccount, deletePaymentAccount, getMe, getPublicProfile } = await import(
  '../../../src/services/user.service.js'
);

const stats = { completedTrades: 4, completionRate: 100 };

beforeEach(() => {
  vi.clearAllMocks();
  getUserTradeStats.mockResolvedValue(stats);
});

describe('getMe', () => {
  it('returns the session user with reputation', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'usr_1', email: 'ada@x.ng' });
    expect(await getMe('usr_1')).toEqual({ id: 'usr_1', email: 'ada@x.ng', stats });
  });
});

describe('getPublicProfile', () => {
  it('matches the display name case-insensitively and hides banned traders', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'usr_1', displayName: 'ada' });
    prisma.order.findMany.mockResolvedValue([{ id: 'o1' }]);

    const profile = await getPublicProfile('ADA');
    expect(profile).toMatchObject({ displayName: 'ada', stats, activeOrders: [{ id: 'o1' }] });

    const { where } = prisma.user.findFirst.mock.calls[0][0];
    expect(where.displayName).toEqual({ equals: 'ADA', mode: 'insensitive' });
    expect(where.status).toEqual({ not: 'BANNED' });
  });

  it('404s for unknown traders', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(getPublicProfile('ghost')).rejects.toMatchObject({ status: 404, message: 'Trader not found' });
  });
});

describe('addPaymentAccount', () => {
  it('saves an account for the user', async () => {
    prisma.paymentAccount.count.mockResolvedValue(1);
    prisma.paymentAccount.create.mockImplementation(async ({ data }) => data);
    expect(await addPaymentAccount('usr_1', { method: 'OPAY' })).toEqual({ method: 'OPAY', userId: 'usr_1' });
  });

  it('caps how many accounts can be saved', async () => {
    prisma.paymentAccount.count.mockResolvedValue(10);
    await expect(addPaymentAccount('usr_1', { method: 'OPAY' })).rejects.toMatchObject({ code: 'TOO_MANY_ACCOUNTS' });
  });

  it('explains duplicates instead of leaking the database error', async () => {
    prisma.paymentAccount.count.mockResolvedValue(0);
    prisma.paymentAccount.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(addPaymentAccount('usr_1', { method: 'OPAY' })).rejects.toMatchObject({
      status: 409,
      message: 'You already saved this account',
    });
  });

  it('rethrows other database errors', async () => {
    prisma.paymentAccount.count.mockResolvedValue(0);
    prisma.paymentAccount.create.mockRejectedValue(new Error('database down'));
    await expect(addPaymentAccount('usr_1', {})).rejects.toThrow('database down');
  });
});

describe('deletePaymentAccount', () => {
  it('only deletes your own account', async () => {
    prisma.paymentAccount.deleteMany.mockResolvedValue({ count: 1 });
    await deletePaymentAccount('usr_1', 'pa_1');
    expect(prisma.paymentAccount.deleteMany).toHaveBeenCalledWith({ where: { id: 'pa_1', userId: 'usr_1' } });
  });

  it('404s when nothing was deleted', async () => {
    prisma.paymentAccount.deleteMany.mockResolvedValue({ count: 0 });
    await expect(deletePaymentAccount('usr_1', 'pa_9')).rejects.toMatchObject({ status: 404 });
  });
});
