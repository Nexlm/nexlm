import { describe, expect, it } from 'vitest';
import {
  AppError,
  badRequest,
  conflict,
  forbidden,
  notFound,
  serviceUnavailable,
  unauthorized,
  unprocessable,
} from '../../../src/lib/errors.js';

describe('AppError', () => {
  it('carries status, code and details', () => {
    const err = new AppError(418, 'Short and stout', 'TEAPOT', { spout: true });
    expect(err).toBeInstanceOf(Error);
    expect(err).toMatchObject({ name: 'AppError', status: 418, code: 'TEAPOT', message: 'Short and stout', details: { spout: true } });
  });

  it('defaults the code', () => {
    expect(new AppError(500, 'x').code).toBe('ERROR');
  });
});

describe('error helpers', () => {
  it.each([
    [badRequest('bad'), 400, 'BAD_REQUEST'],
    [unauthorized(), 401, 'UNAUTHORIZED'],
    [forbidden(), 403, 'FORBIDDEN'],
    [notFound(), 404, 'NOT_FOUND'],
    [conflict('taken'), 409, 'CONFLICT'],
    [unprocessable('nope'), 422, 'UNPROCESSABLE'],
    [serviceUnavailable('down'), 503, 'SERVICE_UNAVAILABLE'],
  ])('%s maps to %i %s', (err, status, code) => {
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(status);
    expect(err.code).toBe(code);
  });

  it('uses readable default messages', () => {
    expect(unauthorized().message).toBe('Authentication required');
    expect(forbidden().message).toBe('You do not have access to this resource');
    expect(notFound().message).toBe('Resource not found');
  });

  it('allows custom codes where the client needs to branch', () => {
    expect(unauthorized('Expired', 'TOKEN_EXPIRED').code).toBe('TOKEN_EXPIRED');
    expect(unprocessable('Closed', 'PAYMENT_WINDOW_CLOSED').code).toBe('PAYMENT_WINDOW_CLOSED');
    expect(serviceUnavailable('Off', 'UPLOADS_NOT_CONFIGURED', { hint: 1 }).details).toEqual({ hint: 1 });
  });
});
