import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../../../src/middleware/auth.js';

const user = { id: 'usr_1', role: 'USER' };

describe('access tokens', () => {
  it('carries the user id and role', () => {
    const payload = verifyAccessToken(signAccessToken(user));
    expect(payload).toMatchObject({ sub: 'usr_1', role: 'USER' });
  });

  it('expires', () => {
    const payload = verifyAccessToken(signAccessToken(user));
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('rejects tokens signed with another secret', () => {
    const forged = jwt.sign({ sub: 'usr_1', role: 'ADMIN' }, 'not-the-real-secret-but-long-enough-x');
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('rejects expired tokens', () => {
    const expired = jwt.sign({ sub: 'usr_1' }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect(() => verifyAccessToken(expired)).toThrow('jwt expired');
  });

  it('rejects tampered tokens', () => {
    const token = signAccessToken(user);
    expect(() => verifyAccessToken(`${token}x`)).toThrow();
  });
});
