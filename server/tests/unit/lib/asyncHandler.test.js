import { describe, expect, it, vi } from 'vitest';
import { asyncHandler } from '../../../src/lib/asyncHandler.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('asyncHandler', () => {
  it('forwards rejections to next', async () => {
    const next = vi.fn();
    const error = new Error('boom');
    asyncHandler(async () => {
      throw error;
    })({}, {}, next);
    await flush();
    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards synchronous throws to next', async () => {
    const next = vi.fn();
    const error = new Error('sync');
    asyncHandler(() => {
      throw error;
    })({}, {}, next);
    await flush();
    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next when the handler succeeds', async () => {
    const next = vi.fn();
    const res = { json: vi.fn() };
    asyncHandler(async (_req, r) => r.json({ ok: true }))({}, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
});
