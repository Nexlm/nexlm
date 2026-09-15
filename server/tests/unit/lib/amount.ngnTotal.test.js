import { describe, expect, it } from 'vitest';
import { ngnTotal } from '../../../src/lib/amount.js';

describe('ngnTotal', () => {
  it('multiplies the XLM amount by the Naira rate', () => {
    expect(ngnTotal('10', '1500.50')).toBe('15005.00');
    expect(ngnTotal('250', '612.4')).toBe('153100.00');
  });

  it('rounds half a kobo up', () => {
    expect(ngnTotal('0.005', '1')).toBe('0.01');
  });

  it('rounds less than half a kobo down', () => {
    expect(ngnTotal('0.0049999', '1')).toBe('0.00');
  });

  it('handles fractional stroop amounts at high rates', () => {
    expect(ngnTotal('0.0000001', '1000000')).toBe('0.10');
  });
});
