import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/jobs/expireOrders.js', () => ({ expireOrders: vi.fn() }));
vi.mock('../../../src/jobs/autoCancelTrades.js', () => ({ autoCancelTrades: vi.fn() }));
vi.mock('../../../src/jobs/reconcileTrades.js', () => ({ reconcileTrades: vi.fn() }));

const { expireOrders } = await import('../../../src/jobs/expireOrders.js');
const { autoCancelTrades } = await import('../../../src/jobs/autoCancelTrades.js');
const { reconcileTrades } = await import('../../../src/jobs/reconcileTrades.js');

async function freshRunner() {
  vi.resetModules();
  const { runDueJobs } = await import('../../../src/jobs/runDueJobs.js');
  return runDueJobs;
}

beforeEach(() => {
  vi.clearAllMocks();
  expireOrders.mockResolvedValue(1);
  autoCancelTrades.mockResolvedValue(2);
  reconcileTrades.mockResolvedValue(3);
});

describe('runDueJobs', () => {
  it('runs every job and reports what it did', async () => {
    const runDueJobs = await freshRunner();
    expect(await runDueJobs()).toEqual({ expiredOrders: 1, autoCancelledTrades: 2, reconciledTrades: 3 });
  });

  it('throttles repeat runs within the interval', async () => {
    const runDueJobs = await freshRunner();
    await runDueJobs();
    expect(await runDueJobs()).toBeNull();
    expect(expireOrders).toHaveBeenCalledTimes(1);
  });

  it('runs again once the interval has passed', async () => {
    const runDueJobs = await freshRunner();
    await runDueJobs();
    await runDueJobs({ minIntervalMs: 0 });
    expect(expireOrders).toHaveBeenCalledTimes(2);
  });

  it('force runs for the cron endpoint', async () => {
    const runDueJobs = await freshRunner();
    await runDueJobs();
    expect(await runDueJobs({ force: true })).not.toBeNull();
  });

  it('shares one run between concurrent requests', async () => {
    const runDueJobs = await freshRunner();
    const [a, b] = await Promise.all([runDueJobs(), runDueJobs({ force: true })]);
    expect(a).toBe(b);
    expect(expireOrders).toHaveBeenCalledTimes(1);
  });

  it('swallows job failures so requests still succeed', async () => {
    const runDueJobs = await freshRunner();
    expireOrders.mockRejectedValue(new Error('database down'));
    expect(await runDueJobs()).toBeNull();
  });
});
