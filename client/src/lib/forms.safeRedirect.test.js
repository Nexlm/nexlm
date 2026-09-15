import { describe, expect, it } from 'vitest';
import { safeRedirect } from './forms.js';

describe('safeRedirect', () => {
  it('keeps in-app paths', () => {
    expect(safeRedirect('/trades/abc')).toBe('/trades/abc');
  });

  it('blocks off-site redirects after login', () => {
    for (const bad of ['//evil.example', 'https://evil.example', 'javascript:alert(1)', 'evil']) {
      expect(safeRedirect(bad)).toBe('/');
    }
  });

  it('uses the given fallback for missing values', () => {
    expect(safeRedirect(undefined, '/market')).toBe('/market');
    expect(safeRedirect(null, '/market')).toBe('/market');
  });
});
