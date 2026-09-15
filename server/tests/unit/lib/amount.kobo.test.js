import { describe, expect, it } from 'vitest';
import { fromKobo, toKobo } from '../../../src/lib/amount.js';

describe('toKobo', () => {
  it('converts Naira with up to two decimals', () => {
    expect(toKobo('1500')).toBe(150_000n);
    expect(toKobo('1500.5')).toBe(150_050n);
    expect(toKobo('0.01')).toBe(1n);
  });

  it('rejects sub-kobo precision', () => {
    expect(() => toKobo('1.234')).toThrow('Invalid NGN amount');
  });
});

describe('fromKobo', () => {
  it('always shows two decimals', () => {
    expect(fromKobo(150_050n)).toBe('1500.50');
    expect(fromKobo(0)).toBe('0.00');
    expect(fromKobo(5)).toBe('0.05');
  });

  it('round-trips with toKobo', () => {
    for (const value of ['0.00', '1.10', '98765.43']) {
      expect(fromKobo(toKobo(value))).toBe(value);
    }
  });
});
