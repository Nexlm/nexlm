import { describe, expect, it } from 'vitest';
import { toStroops } from '../../../src/lib/amount.js';

describe('toStroops', () => {
  it('converts whole XLM', () => {
    expect(toStroops('1')).toBe(10_000_000n);
    expect(toStroops('250')).toBe(2_500_000_000n);
  });

  it('keeps all seven decimal places', () => {
    expect(toStroops('0.0000001')).toBe(1n);
    expect(toStroops('12.5')).toBe(125_000_000n);
  });

  it('accepts numbers and surrounding whitespace', () => {
    expect(toStroops(3)).toBe(30_000_000n);
    expect(toStroops(' 12.5 ')).toBe(125_000_000n);
  });

  it('accepts Decimal-like values', () => {
    const decimal = { toFixed: (digits) => (3.14).toFixed(digits) };
    expect(toStroops(decimal)).toBe(31_400_000n);
  });

  it('rejects amounts it cannot represent exactly', () => {
    for (const bad of ['1.00000001', '-1', 'abc', '', '1e5', '.5']) {
      expect(() => toStroops(bad)).toThrow('Invalid XLM amount');
    }
  });
});
