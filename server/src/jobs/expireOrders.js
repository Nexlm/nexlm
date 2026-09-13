import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { broadcast } from '../socket/io.js';

/** Marks active orders past their expiry time as EXPIRED. */
export async function expireOrders(now = new Date()) {
  const due = await prisma.order.findMany({
    where: { status: 'ACTIVE', expiresAt: { lte: now } },
    select: { id: true },
    take: 500,
  });
  if (due.length === 0) return 0;

  const ids = due.map((o) => o.id);
  const { count } = await prisma.order.updateMany({
    where: { id: { in: ids }, status: 'ACTIVE' },
    data: { status: 'EXPIRED' },
  });

  ids.forEach((id) => broadcast('order:removed', { id }));
  logger.info(`Expired ${count} order(s)`);
  return count;
}
