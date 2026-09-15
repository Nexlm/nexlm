import { describe, expect, it } from 'vitest';
import { ngnRate, xlmAmount } from '../../../src/validators/common.js';

describe('xlmAmount', () => {
  it('normalises numbers and strings to trimmed strings', () => {
    expect(xlmAmount.parse(25)).toBe('25');
    expect(xlmAmount.parse(' 12.5 ')).toBe('12.5');
  });

  it('allows seven decimal places', () => {
    expect(xlmAmount.parse('0.0000001')).toBe('0.0000001');
    expect(xlmAmount.safeParse('0.00000001').success).toBe(false);
  });

  it('rejects zero, negatives and junk', () => {
    for (const bad of ['0', '0.0', '-1', 'ten', '', '1,000']) {
      expect(xlmAmount.safeParse(bad).success).toBe(false);
    }
  });
});

describe('ngnRate', () => {
  it('accepts kobo precision', () => {
    expect(ngnRate.parse('1500.25')).toBe('1500.25');
    expect(ngnRate.parse(612)).toBe('612');
  });

  it('rejects sub-kobo rates and zero', () => {
    expect(ngnRate.safeParse('1500.255').success).toBe(false);
    expect(ngnRate.safeParse('0').success).toBe(false);
  });
});
