import multer from 'multer';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError, conflict } from '../../../src/lib/errors.js';
import { logger } from '../../../src/lib/logger.js';
import { errorHandler, notFoundHandler } from '../../../src/middleware/errorHandler.js';

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

const handle = (err) => {
  const res = mockRes();
  errorHandler(err, { method: 'GET', path: '/api/test' }, res, vi.fn());
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
};

describe('errorHandler', () => {
  it('formats zod errors with field paths', () => {
    const result = z.object({ amount: z.string({ required_error: 'Amount is required' }) }).safeParse({});
    const { status, body } = handle(result.error);
    expect(status).toBe(400);
    expect(body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Amount is required',
      details: [{ path: 'amount', message: 'Amount is required' }],
    });
  });

  it('explains oversized uploads', () => {
    const { status, body } = handle(new multer.MulterError('LIMIT_FILE_SIZE'));
    expect(status).toBe(400);
    expect(body.error).toEqual({ code: 'UPLOAD_ERROR', message: 'Image must be 5 MB or smaller' });
  });

  it('reports invalid JSON bodies', () => {
    expect(handle({ type: 'entity.parse.failed' })).toEqual({
      status: 400,
      body: { error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } },
    });
  });

  it('maps Prisma unique and not-found errors', () => {
    expect(handle({ code: 'P2002' }).status).toBe(409);
    expect(handle({ code: 'P2025' }).status).toBe(404);
  });

  it('passes AppError details through', () => {
    const { status, body } = handle(conflict('Order already taken', { orderId: 'o1' }));
    expect(status).toBe(409);
    expect(body.error).toEqual({ code: 'CONFLICT', message: 'Order already taken', details: { orderId: 'o1' } });
  });

  it('logs 5xx AppErrors as warnings', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    handle(new AppError(503, 'Horizon unavailable', 'HORIZON_DOWN'));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('hides unexpected errors from clients', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { status, body } = handle(new Error('secret stack detail'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secret stack detail');
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('notFoundHandler', () => {
  it('forwards a ROUTE_NOT_FOUND error', () => {
    const next = vi.fn();
    notFoundHandler({ method: 'POST', path: '/api/nope' }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 404, code: 'ROUTE_NOT_FOUND', message: 'Route POST /api/nope not found' });
  });
});
