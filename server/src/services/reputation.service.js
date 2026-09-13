import { prisma } from '../lib/prisma.js';
import { foldTradeStats } from '../lib/reputation.js';

const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED'];

/** Completed trade count and completion rate for a set of users. */
export async function getTradeStats(userIds) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();

  const [asBuyer, asSeller] = await Promise.all([
    prisma.trade.groupBy({
      by: ['buyerId', 'status'],
      where: { buyerId: { in: ids }, status: { in: CLOSED_STATUSES } },
      _count: { _all: true },
    }),
    prisma.trade.groupBy({
      by: ['sellerId', 'status'],
      where: { sellerId: { in: ids }, status: { in: CLOSED_STATUSES } },
      _count: { _all: true },
    }),
  ]);

  const rows = [
    ...asBuyer.map((r) => ({ userId: r.buyerId, status: r.status, count: r._count._all })),
    ...asSeller.map((r) => ({ userId: r.sellerId, status: r.status, count: r._count._all })),
  ];

  return foldTradeStats(ids, rows);
}

export async function getUserTradeStats(userId) {
  const stats = await getTradeStats([userId]);
  return stats.get(userId);
}

/** Adds `stats` to each object's nested user (defaults to the `user` key). */
export async function withUserStats(items, key = 'user') {
  const stats = await getTradeStats(items.map((i) => i[key].id));
  return items.map((i) => ({ ...i, [key]: { ...i[key], stats: stats.get(i[key].id) } }));
}
