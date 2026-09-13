import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { expireTrade } from '../services/trade.service.js';

/** Refunds sellers on trades whose payment window closed before the buyer paid. */
export async function autoCancelTrades(now = new Date()) {
  const overdue = await prisma.trade.findMany({
    where: { status: 'ESCROW_LOCKED', paymentDeadline: { lte: now } },
    select: { id: true },
    orderBy: { paymentDeadline: 'asc' },
    take: 20,
  });

  let refunded = 0;
  for (const { id } of overdue) {
    try {
      if (await expireTrade(id)) refunded += 1;
    } catch (err) {
      // Leave it for the next tick; the escrow still holds the funds safely.
      logger.error('Auto-cancel failed', { tradeId: id, err });
    }
  }

  if (refunded) logger.info(`Auto-cancelled ${refunded} overdue trade(s)`);
  return refunded;
}
