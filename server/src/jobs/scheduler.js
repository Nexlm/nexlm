import { logger } from '../lib/logger.js';
import { autoCancelTrades } from './autoCancelTrades.js';
import { expireOrders } from './expireOrders.js';
import { reconcileTrades } from './reconcileTrades.js';

const JOBS = [
  { name: 'expire-orders', intervalMs: 30_000, run: expireOrders },
  { name: 'auto-cancel-trades', intervalMs: 15_000, run: autoCancelTrades },
  { name: 'reconcile-trades', intervalMs: 60_000, run: reconcileTrades },
];

/** Runs each job on an interval, never letting two runs of the same job overlap. */
export function startScheduler() {
  const timers = JOBS.map((job) => {
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        await job.run();
      } catch (err) {
        logger.error(`Job ${job.name} failed`, { err });
      } finally {
        running = false;
      }
    };
    return setInterval(tick, job.intervalMs);
  });

  logger.info(`Scheduler started (${JOBS.map((j) => j.name).join(', ')})`);
  return () => timers.forEach(clearInterval);
}
