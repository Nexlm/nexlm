import { describe, expect, it } from 'vitest';
import {
  apiLimiter,
  authLimiter,
  chatKey,
  chatLimiter,
  orderLimiter,
  sensitiveLimiter,
  userKey,
} from '../../../src/middleware/rateLimit.js';

const limiters = { apiLimiter, authLimiter, chatLimiter, orderLimiter, sensitiveLimiter };

describe('rate limiters', () => {
  it('are all installed as middleware', () => {
    for (const [name, limiter] of Object.entries(limiters)) {
      expect(typeof limiter, name).toBe('function');
    }
  });

  it('stay out of the way in tests', async () => {
    // Every limiter shares `skip: () => env.isTest`; without it the suite would
    // start failing once a test file made its 21st login attempt.
    const req = { ip: '127.0.0.1', headers: {}, params: {} };
    const res = { setHeader: () => {}, getHeader: () => undefined };

    for (const [name, limiter] of Object.entries(limiters)) {
      const passed = await new Promise((resolve) => limiter(req, res, () => resolve(true)));
      expect(passed, name).toBe(true);
    }
  });
});

describe('chatKey', () => {
  it('counts per trade, so one noisy room cannot silence another', () => {
    expect(chatKey({ user: { id: 'usr_1' }, params: { id: 'trd_1' }, ip: '1.1.1.1' })).toBe('usr_1:trd_1');
    expect(chatKey({ user: { id: 'usr_1' }, params: { id: 'trd_2' }, ip: '1.1.1.1' })).toBe('usr_1:trd_2');
  });

  it('separates two traders in the same room', () => {
    const room = { params: { id: 'trd_1' }, ip: '1.1.1.1' };
    expect(chatKey({ ...room, user: { id: 'buyer' } })).not.toBe(chatKey({ ...room, user: { id: 'seller' } }));
  });

  it('falls back to the network address for an unauthenticated caller', () => {
    expect(chatKey({ params: { id: 'trd_1' }, ip: '1.1.1.1' })).toBe('1.1.1.1:trd_1');
  });
});

describe('userKey', () => {
  it('counts per account rather than per IP, so shared networks are not punished', () => {
    expect(userKey({ user: { id: 'usr_1' }, ip: '1.1.1.1' })).toBe('usr_1');
    expect(userKey({ ip: '1.1.1.1' })).toBe('1.1.1.1');
  });
});
