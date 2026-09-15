import { describe, expect, it, vi } from 'vitest';
import { env } from '../../../src/config/env.js';
import { requireTradingEligibility, requireVerifiedEmail } from '../../../src/middleware/requireTrading.js';

const check = (middleware, user) => {
  const next = vi.fn();
  middleware({ user }, {}, next);
  return next.mock.calls[0][0];
};

const verified = { emailVerified: true, kycStatus: 'VERIFIED' };

describe('requireTradingEligibility', () => {
  it('lets fully verified traders through', () => {
    expect(check(requireTradingEligibility, verified)).toBeUndefined();
  });

  it('asks for email verification first', () => {
    expect(check(requireTradingEligibility, { ...verified, emailVerified: false })).toMatchObject({
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
    });
  });

  it('asks for KYC when it is required', () => {
    expect(env.REQUIRE_KYC).toBe(true);
    for (const kycStatus of ['UNVERIFIED', 'PENDING', 'REJECTED']) {
      expect(check(requireTradingEligibility, { ...verified, kycStatus })).toMatchObject({ code: 'KYC_REQUIRED' });
    }
  });
});

describe('requireVerifiedEmail', () => {
  it('only checks the email', () => {
    expect(check(requireVerifiedEmail, { emailVerified: true, kycStatus: 'UNVERIFIED' })).toBeUndefined();
    expect(check(requireVerifiedEmail, { emailVerified: false })).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
  });
});
