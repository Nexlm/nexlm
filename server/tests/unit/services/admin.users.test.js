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
const { getUserTradeStats } = await import('../../../src/services/reputation.service.js');
const { getUser, listUsers, reviewKyc, setUserStatus } = await import('../../../src/services/admin.service.js');

const admin = { id: 'admin_1' };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findMany.mockResolvedValue([]);
  prisma.user.count.mockResolvedValue(0);
  prisma.trade.findMany.mockResolvedValue([]);
  prisma.paymentAccount.findMany.mockResolvedValue([]);
  getUserTradeStats.mockResolvedValue({ completedTrades: 3, completionRate: 100 });
  prisma.user.update.mockImplementation(async ({ data }) => ({ id: 'usr_1', ...data }));
});

describe('listUsers', () => {
  it('searches email, display name and wallet address', async () => {
    await listUsers({ q: 'ada', page: 1, pageSize: 20 });
    const { where } = prisma.user.findMany.mock.calls[0][0];
    expect(where.OR).toEqual([
      { email: { contains: 'ada', mode: 'insensitive' } },
      { displayName: { contains: 'ada', mode: 'insensitive' } },
      { stellarPublicKey: 'ada' },
    ]);
  });

  it('filters by account and KYC status', async () => {
    await listUsers({ status: 'SUSPENDED', kycStatus: 'PENDING', page: 1, pageSize: 20 });
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ status: 'SUSPENDED', kycStatus: 'PENDING' });
  });

  it('never selects password hashes or wallet secrets', async () => {
    await listUsers({ page: 1, pageSize: 20 });
    const { select } = prisma.user.findMany.mock.calls[0][0];
    expect(select.passwordHash).toBeUndefined();
    expect(select.stellarSecretEnc).toBeUndefined();
    expect(select.kycIdHash).toBeUndefined();
  });
});

describe('getUser', () => {
  it('returns the account with reputation, recent trades and payout accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'usr_1', email: 'ada@x.ng' });
    const user = await getUser('usr_1');
    expect(user).toMatchObject({ id: 'usr_1', stats: { completedTrades: 3 }, recentTrades: [], paymentAccounts: [] });
  });

  it('404s for unknown accounts', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(getUser('nope')).rejects.toMatchObject({ status: 404 });
  });
});

describe('setUserStatus', () => {
  it('suspends a trader and pulls their offers off the market', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    await setUserStatus(admin, 'usr_1', 'SUSPENDED');
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { userId: 'usr_1', status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
  });

  it('leaves offers alone when reactivating', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    await setUserStatus(admin, 'usr_1', 'ACTIVE');
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to change your own status', async () => {
    await expect(setUserStatus(admin, 'admin_1', 'BANNED')).rejects.toMatchObject({
      message: 'You cannot change your own status',
    });
  });

  it('refuses to restrict other admins', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    await expect(setUserStatus(admin, 'admin_2', 'BANNED')).rejects.toMatchObject({
      message: 'Admin accounts cannot be restricted here',
    });
  });

  it('404s for unknown accounts', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(setUserStatus(admin, 'nope', 'BANNED')).rejects.toMatchObject({ status: 404 });
  });
});

describe('reviewKyc', () => {
  it('approves a pending submission and stamps the review', async () => {
    prisma.user.findUnique.mockResolvedValue({ kycStatus: 'PENDING' });
    const user = await reviewKyc('usr_1', 'APPROVE');
    expect(user.kycStatus).toBe('VERIFIED');
    expect(user.kycReviewedAt).toBeInstanceOf(Date);
  });

  it('rejects a submission', async () => {
    prisma.user.findUnique.mockResolvedValue({ kycStatus: 'PENDING' });
    expect((await reviewKyc('usr_1', 'REJECT')).kycStatus).toBe('REJECTED');
  });

  it('refuses when there is nothing pending', async () => {
    prisma.user.findUnique.mockResolvedValue({ kycStatus: 'VERIFIED' });
    await expect(reviewKyc('usr_1', 'APPROVE')).rejects.toMatchObject({
      status: 409,
      message: 'This user has no pending verification',
    });
  });
});
