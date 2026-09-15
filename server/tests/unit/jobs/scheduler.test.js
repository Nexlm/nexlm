import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/jobs/expireOrders.js', () => ({ expireOrders: vi.fn() }));
vi.mock('../../../src/jobs/autoCancelTrades.js', () => ({ autoCancelTrades: vi.fn() }));
vi.mock('../../../src/jobs/reconcileTrades.js', () => ({ reconcileTrades: vi.fn() }));

const { expireOrders } = await import('../../../src/jobs/expireOrders.js');
const { autoCancelTrades } = await import('../../../src/jobs/autoCancelTrades.js');
const { reconcileTrades } = await import('../../../src/jobs/reconcileTrades.js');
const { startScheduler } = await import('../../../src/jobs/scheduler.js');

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  for (const job of [expireOrders, autoCancelTrades, reconcileTrades]) job.mockResolvedValue(0);
});

afterEach(() => vi.useRealTimers());

describe('startScheduler', () => {
  it('runs each job on its own interval', async () => {
    const stop = startScheduler();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(autoCancelTrades).toHaveBeenCalledTimes(4); // every 15s
    expect(expireOrders).toHaveBeenCalledTimes(2); // every 30s
    expect(reconcileTrades).toHaveBeenCalledTimes(1); // every 60s
    stop();
  });

  it('never overlaps two runs of the same job', async () => {
    let resolve;
    autoCancelTrades.mockImplementation(() => new Promise((r) => (resolve = r)));
    const stop = startScheduler();

    await vi.advanceTimersByTimeAsync(45_000);
    expect(autoCancelTrades).toHaveBeenCalledTimes(1);

    resolve(0);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(autoCancelTrades).toHaveBeenCalledTimes(2);
    stop();
  });

  it('keeps running after a job throws', async () => {
    expireOrders.mockRejectedValue(new Error('database down'));
    const stop = startScheduler();
    await vi.advanceTimersByTimeAsync(90_000);
    expect(expireOrders).toHaveBeenCalledTimes(3);
    stop();
  });

  it('stops every timer when the returned function is called', async () => {
    const stop = startScheduler();
    stop();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(expireOrders).not.toHaveBeenCalled();
  });
});
