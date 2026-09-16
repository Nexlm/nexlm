import { describe, expect, it, vi } from 'vitest';
import { requestId } from '../../../src/middleware/requestId.js';

const run = (headers = {}) => {
  const req = { headers };
  const res = { setHeader: vi.fn() };
  const next = vi.fn();
  requestId(req, res, next);
  return { req, res, next };
};

describe('requestId', () => {
  it('gives every request an id and echoes it back', () => {
    const { req, res, next } = run();

    expect(req.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalledWith();
  });

  it('keeps the trace when a proxy already set an id', () => {
    const { req } = run({ 'x-request-id': 'edge-7f3a91c4' });
    expect(req.id).toBe('edge-7f3a91c4');
  });

  it('ignores an id that could poison the logs', () => {
    for (const bad of ['short', 'x'.repeat(65), 'has spaces', 'inject\nnewline']) {
      expect(run({ 'x-request-id': bad }).req.id).not.toBe(bad);
    }
  });

  it('gives different requests different ids', () => {
    expect(run().req.id).not.toBe(run().req.id);
  });
});
