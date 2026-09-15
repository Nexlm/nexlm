import { logger } from '../lib/logger.js';
import { autoCancelTrades } from './autoCancelTrades.js';
import { expireOrders } from './expireOrders.js';
import { reconcileTrades } from './reconcileTrades.js';

let lastRunAt = 0;
let inFlight = null;

/**
 * Runs order expiry, auto-refunds and reconciliation at most once per
 * `minIntervalMs` per instance. Serverless deployments call this on incoming
 * API traffic and from the cron endpoint instead of using timers.
 */
export function runDueJobs({ force = false, minIntervalMs = 15_000 } = {}) {
  const now = Date.now();
  if (inFlight) return inFlight;
  if (!force && now - lastRunAt < minIntervalMs) return Promise.resolve(null);

  lastRunAt = now;
  inFlight = (async () => {
    const result = {
      expiredOrders: await expireOrders(),
      autoCancelledTrades: await autoCancelTrades(),
      reconciledTrades: await reconcileTrades(),
    };
    return result;
  })()
    .catch((err) => {
      logger.error('On-demand jobs failed', { err });
      return null;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
