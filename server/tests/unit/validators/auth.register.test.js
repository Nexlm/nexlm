import { describe, expect, it } from 'vitest';
import { displayName, loginBody, registerBody } from '../../../src/validators/auth.js';

describe('displayName', () => {
  it('allows letters, numbers and underscores', () => {
    expect(displayName.parse(' ada_trades9 ')).toBe('ada_trades9');
  });

  it('enforces length and characters', () => {
    expect(displayName.safeParse('ab').success).toBe(false);
    expect(displayName.safeParse('a'.repeat(25)).success).toBe(false);
    expect(displayName.safeParse('ada lovelace').success).toBe(false);
    expect(displayName.safeParse('ada-trades').success).toBe(false);
  });
});

describe('registerBody', () => {
  it('parses a complete registration', () => {
    expect(registerBody.parse({ email: 'Ada@x.ng', password: 'naira2026', displayName: 'ada' })).toEqual({
      email: 'ada@x.ng',
      password: 'naira2026',
      displayName: 'ada',
    });
  });

  it('requires every field', () => {
    expect(registerBody.safeParse({ email: 'ada@x.ng', password: 'naira2026' }).success).toBe(false);
  });
});

describe('loginBody', () => {
  it('does not apply password strength rules on login', () => {
    expect(loginBody.safeParse({ email: 'ada@x.ng', password: 'old' }).success).toBe(true);
  });

  it('requires a password', () => {
    expect(loginBody.safeParse({ email: 'ada@x.ng', password: '' }).success).toBe(false);
  });
});
