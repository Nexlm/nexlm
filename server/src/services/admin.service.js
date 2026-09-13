import { badRequest, conflict, notFound } from '../lib/errors.js';
import { paginated, toPrismaPage } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import { publicUserSelect } from '../lib/selects.js';
import { getUserTradeStats } from './reputation.service.js';

const adminUserSelect = {
  id: true,
  email: true,
  displayName: true,
  phone: true,
  role: true,
  status: true,
  emailVerified: true,
  kycStatus: true,
  kycIdType: true,
  kycIdLast4: true,
  kycFullName: true,
  kycReference: true,
  kycSubmittedAt: true,
  kycReviewedAt: true,
  stellarPublicKey: true,
  createdAt: true,
};

export async function getOverview() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [users, verifiedUsers, pendingKyc, activeTrades, completed30d, cancelled30d, volume30d, activeOrders] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { kycStatus: 'VERIFIED' } }),
      prisma.user.count({ where: { kycStatus: 'PENDING' } }),
      prisma.trade.count({ where: { status: { in: ['PENDING_ESCROW', 'ESCROW_LOCKED', 'PAID', 'RELEASING', 'REFUNDING'] } } }),
      prisma.trade.count({ where: { status: 'COMPLETED', completedAt: { gte: since } } }),
      prisma.trade.count({ where: { status: 'CANCELLED', cancelledAt: { gte: since } } }),
      prisma.trade.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: since } },
        _sum: { ngnAmount: true, xlmAmount: true },
      }),
      prisma.order.count({ where: { status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
    ]);

  const closed = completed30d + cancelled30d;

  return {
    users: { total: users, verified: verifiedUsers, pendingKyc },
    trades: {
      active: activeTrades,
      completed30d,
      cancelled30d,
      completionRate30d: closed ? Math.round((completed30d / closed) * 1000) / 10 : null,
    },
    volume30d: {
      ngn: volume30d._sum.ngnAmount ?? '0',
      xlm: volume30d._sum.xlmAmount ?? '0',
    },
    activeOrders,
  };
}

export async function listUsers({ q, status, kycStatus, ...pageInput }) {
  const { skip, take, page, pageSize } = toPrismaPage(pageInput);
  const where = {
    ...(status && { status }),
    ...(kycStatus && { kycStatus }),
    ...(q && {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { stellarPublicKey: q },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: adminUserSelect, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.user.count({ where }),
  ]);
  return paginated(items, total, { page, pageSize });
}

export async function getUser(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: adminUserSelect });
  if (!user) throw notFound('User not found');

  const [stats, recentTrades, paymentAccounts] = await Promise.all([
    getUserTradeStats(id),
    prisma.trade.findMany({
      where: { OR: [{ buyerId: id }, { sellerId: id }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { buyer: { select: publicUserSelect }, seller: { select: publicUserSelect } },
    }),
    prisma.paymentAccount.findMany({ where: { userId: id } }),
  ]);

  return { ...user, stats, recentTrades, paymentAccounts };
}

export async function setUserStatus(admin, id, status) {
  if (admin.id === id) throw badRequest('You cannot change your own status');
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!user) throw notFound('User not found');
  if (user.role === 'ADMIN') throw badRequest('Admin accounts cannot be restricted here');

  const updated = await prisma.user.update({ where: { id }, data: { status }, select: adminUserSelect });

  if (status !== 'ACTIVE') {
    await prisma.order.updateMany({ where: { userId: id, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
  }
  return updated;
}

export async function reviewKyc(userId, decision) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } });
  if (!user) throw notFound('User not found');
  if (user.kycStatus !== 'PENDING') throw conflict('This user has no pending verification');

  return prisma.user.update({
    where: { id: userId },
    data: { kycStatus: decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED', kycReviewedAt: new Date() },
    select: adminUserSelect,
  });
}

export async function listTrades({ status, ...pageInput }) {
  const { skip, take, page, pageSize } = toPrismaPage(pageInput);
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      include: { buyer: { select: publicUserSelect }, seller: { select: publicUserSelect } },
    }),
    prisma.trade.count({ where }),
  ]);
  return paginated(items, total, { page, pageSize });
}
