import { describe, expect, it } from 'vitest';
import { formatPercent, shortAddress } from './format.js';

describe('shortAddress', () => {
  const address = 'GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH';

  it('keeps the first and last characters', () => {
    expect(shortAddress(address)).toBe('GA6H…JPIH');
  });

  it('accepts a custom length', () => {
    expect(shortAddress(address, 6)).toBe(`${address.slice(0, 6)}…${address.slice(-6)}`);
  });

  it('returns an empty string when there is no address', () => {
    expect(shortAddress(null)).toBe('');
    expect(shortAddress(undefined)).toBe('');
  });
});

describe('formatPercent', () => {
  it('shows a dash for traders with no history', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
  });

  it('keeps zero visible', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(99.5)).toBe('99.5%');
  });
});
