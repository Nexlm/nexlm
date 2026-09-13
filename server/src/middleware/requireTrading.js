import { env } from '../config/env.js';
import { forbidden } from '../lib/errors.js';

/** Ensures the user may post orders and open trades: verified email and (optionally) KYC. */
export function requireTradingEligibility(req, _res, next) {
  const user = req.user;
  if (!user.emailVerified) {
    return next(forbidden('Verify your email address before trading.', 'EMAIL_NOT_VERIFIED'));
  }
  if (env.REQUIRE_KYC && user.kycStatus !== 'VERIFIED') {
    return next(forbidden('Complete identity verification (BVN or NIN) before trading.', 'KYC_REQUIRED'));
  }
  next();
}

export function requireVerifiedEmail(req, _res, next) {
  if (!req.user.emailVerified) {
    return next(forbidden('Verify your email address first.', 'EMAIL_NOT_VERIFIED'));
  }
  next();
}
