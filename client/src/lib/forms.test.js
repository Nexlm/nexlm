import { describe, expect, it } from 'vitest';
import { fieldErrors, safeRedirect } from './forms.js';

describe('fieldErrors', () => {
  it('maps validation details by path', () => {
    const error = {
      details: [
        { path: 'email', message: 'Enter a valid email address' },
        { path: 'password', message: 'Too short' },
        { path: '', message: 'ignored' },
      ],
    };
    expect(fieldErrors(error)).toEqual({ email: 'Enter a valid email address', password: 'Too short' });
  });

  it('returns an empty object when there are no details', () => {
    expect(fieldErrors(new Error('x'))).toEqual({});
    expect(fieldErrors(null)).toEqual({});
  });
});

describe('safeRedirect', () => {
  it('allows relative app paths', () => {
    expect(safeRedirect('/trades/abc?tab=chat')).toBe('/trades/abc?tab=chat');
  });

  it('blocks external and protocol-relative redirects', () => {
    expect(safeRedirect('https://evil.example')).toBe('/');
    expect(safeRedirect('//evil.example')).toBe('/');
    expect(safeRedirect(null, '/wallet')).toBe('/wallet');
  });
});
