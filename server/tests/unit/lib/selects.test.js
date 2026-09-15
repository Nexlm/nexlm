import { describe, expect, it } from 'vitest';
import { publicUserSelect, sessionUserSelect } from '../../../src/lib/selects.js';

const SECRETS = ['passwordHash', 'stellarSecret', 'kycIdHash', 'emailVerifyToken', 'passwordResetToken'];

describe('user selects', () => {
  it('never selects secrets', () => {
    for (const select of [publicUserSelect, sessionUserSelect]) {
      for (const field of SECRETS) expect(select[field]).toBeUndefined();
    }
  });

  it('keeps the public profile minimal', () => {
    expect(Object.keys(publicUserSelect).sort()).toEqual(['createdAt', 'displayName', 'id', 'kycStatus']);
  });

  it('does not leak email or phone to other traders', () => {
    expect(publicUserSelect.email).toBeUndefined();
    expect(publicUserSelect.phone).toBeUndefined();
  });

  it('gives the session everything the client needs', () => {
    for (const field of ['email', 'role', 'status', 'emailVerified', 'kycStatus', 'stellarPublicKey']) {
      expect(sessionUserSelect[field]).toBe(true);
    }
  });

  it('shares only the last four digits of an ID document', () => {
    expect(sessionUserSelect.kycIdLast4).toBe(true);
    expect(sessionUserSelect.kycIdNumber).toBeUndefined();
  });
});
