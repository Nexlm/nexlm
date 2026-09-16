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

/** Count against the account where we know it, the network address otherwise. */
export const userKey = (req) => req.user?.id ?? req.ip;

/** Chat is counted per room, so one noisy trade cannot silence another. */
export const chatKey = (req) => `${userKey(req)}:${req.params.id}`;

/** Money-moving endpoints such as withdrawals. */
export const sensitiveLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60_000,
  limit: 10,
  keyGenerator: userKey,
});

/**
 * Trade chat. Generous enough for a real conversation, tight enough that a
 * scammer cannot flood a counterparty or fill the dispute log with noise.
 */
export const chatLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 30,
  keyGenerator: chatKey,
});

/** Posting offers: enough to manage a book, not enough to spam the market. */
export const orderLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 12,
  keyGenerator: userKey,
});

/** General API traffic. */
export const apiLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 300 });
