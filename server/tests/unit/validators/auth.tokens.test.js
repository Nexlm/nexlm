import { describe, expect, it } from 'vitest';
import {
  changePasswordBody,
  forgotPasswordBody,
  resetPasswordBody,
  verifyEmailBody,
} from '../../../src/validators/auth.js';

const token = 'a1'.repeat(32);

describe('verifyEmailBody', () => {
  it('accepts 64-character hex tokens', () => {
    expect(verifyEmailBody.parse({ token: ` ${token} ` })).toEqual({ token });
  });

  it('rejects malformed tokens', () => {
    expect(verifyEmailBody.safeParse({ token: 'abc' }).success).toBe(false);
    expect(verifyEmailBody.safeParse({ token: 'Z'.repeat(64) }).success).toBe(false);
  });
});

describe('forgotPasswordBody', () => {
  it('normalises the email', () => {
    expect(forgotPasswordBody.parse({ email: 'ADA@X.NG' })).toEqual({ email: 'ada@x.ng' });
  });
});

describe('resetPasswordBody', () => {
  it('applies password strength rules', () => {
    expect(resetPasswordBody.safeParse({ token, password: 'weak' }).success).toBe(false);
    expect(resetPasswordBody.safeParse({ token, password: 'stronger1' }).success).toBe(true);
  });
});

describe('changePasswordBody', () => {
  it('requires a different new password', () => {
    const result = changePasswordBody.safeParse({ currentPassword: 'naira2026', newPassword: 'naira2026' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['newPassword']);
  });

  it('accepts a valid change', () => {
    expect(changePasswordBody.safeParse({ currentPassword: 'old', newPassword: 'naira2027' }).success).toBe(true);
  });
});
