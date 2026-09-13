import { conflict, notFound, unprocessable } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { publicUserSelect, sessionUserSelect } from '../lib/selects.js';
import { getUserTradeStats } from './reputation.service.js';

const MAX_PAYMENT_ACCOUNTS = 10;

export async function getMe(userId) {
  const [user, stats] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: sessionUserSelect }),
    getUserTradeStats(userId),
  ]);
  return { ...user, stats };
}

export function updateProfile(userId, data) {
  return prisma.user.update({ where: { id: userId }, data, select: sessionUserSelect });
}

export async function getPublicProfile(displayName) {
  const user = await prisma.user.findFirst({
    where: { displayName: { equals: displayName, mode: 'insensitive' }, status: { not: 'BANNED' } },
    select: publicUserSelect,
  });
  if (!user) throw notFound('Trader not found');

  const [stats, activeOrders] = await Promise.all([
    getUserTradeStats(user.id),
    prisma.order.findMany({
      where: { userId: user.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return { ...user, stats, activeOrders };
}

export function listPaymentAccounts(userId) {
  return prisma.paymentAccount.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

export async function addPaymentAccount(userId, data) {
  const count = await prisma.paymentAccount.count({ where: { userId } });
  if (count >= MAX_PAYMENT_ACCOUNTS) {
    throw unprocessable(`You can save up to ${MAX_PAYMENT_ACCOUNTS} payout accounts`, 'TOO_MANY_ACCOUNTS');
  }
  try {
    return await prisma.paymentAccount.create({ data: { ...data, userId } });
  } catch (err) {
    if (err.code === 'P2002') throw conflict('You already saved this account');
    throw err;
  }
}

export async function deletePaymentAccount(userId, id) {
  const result = await prisma.paymentAccount.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw notFound('Payout account not found');
}
