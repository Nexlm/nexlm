import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const handler = (_req, _res, next) =>
  next(new AppError(429, 'Too many requests. Please slow down and try again shortly.', 'RATE_LIMITED'));

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  skip: () => env.isTest,
};

/** Login, registration and password reset. */
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 20 });

/** Money-moving endpoints such as withdrawals. */
export const sensitiveLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60_000,
  limit: 10,
  keyGenerator: (req) => req.user?.id ?? req.ip,
});

/** General API traffic. */
export const apiLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 300 });
