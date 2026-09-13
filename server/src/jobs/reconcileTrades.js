import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { reconcileTrade } from '../services/trade.service.js';

/**
 * Stellar transactions are built with a 60 second timeout, so anything stuck in
 * a transitional state for longer than this can no longer land and is safe to settle.
 */
const STUCK_AFTER_MS = 2 * 60 * 1000;

/** Settles trades whose escrow outcome was unknown (e.g. Horizon timed out). */
export async function reconcileTrades(now = new Date()) {
  const stuck = await prisma.trade.findMany({
    where: {
      status: { in: ['PENDING_ESCROW', 'RELEASING', 'REFUNDING'] },
      updatedAt: { lte: new Date(now.getTime() - STUCK_AFTER_MS) },
    },
    select: { id: true },
    take: 20,
  });

  let settled = 0;
  for (const { id } of stuck) {
    try {
      if (await reconcileTrade(id)) settled += 1;
    } catch (err) {
      logger.error('Trade reconciliation failed', { tradeId: id, err });
    }
  }

  if (settled) logger.info(`Reconciled ${settled} stuck trade(s)`);
  return settled;
}
