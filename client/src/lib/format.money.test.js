import { describe, expect, it } from 'vitest';
import { estimateNgn, formatNgn, formatXlm } from './format.js';

describe('formatNgn', () => {
  it('groups thousands and always shows kobo', () => {
    expect(formatNgn('1500.5')).toMatch(/1,500\.50/);
    expect(formatNgn(0)).toMatch(/0\.00/);
  });

  it('treats missing values as zero', () => {
    expect(formatNgn(null)).toBe(formatNgn(0));
    expect(formatNgn(undefined)).toBe(formatNgn(0));
  });
});

describe('formatXlm', () => {
  it('appends the asset code by default', () => {
    expect(formatXlm('1234.5')).toBe('1,234.5 XLM');
  });

  it('can drop the suffix and limit decimals', () => {
    expect(formatXlm('1234.5', { suffix: false })).toBe('1,234.5');
    expect(formatXlm('0.1234567', { decimals: 2 })).toBe('0.12 XLM');
  });

  it('shows zero for missing balances', () => {
    expect(formatXlm(undefined)).toBe('0 XLM');
  });
});

describe('estimateNgn', () => {
  it('multiplies amount by rate', () => {
    expect(estimateNgn('10', '1500.50')).toBe(15005);
  });

  it('rounds to the kobo', () => {
    expect(estimateNgn('0.333', '3')).toBe(1);
  });

  it('returns zero when either side is not a number', () => {
    expect(estimateNgn('', '1500')).toBe(0);
    expect(estimateNgn('10', 'abc')).toBe(0);
  });
});
