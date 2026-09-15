import { describe, expect, it } from 'vitest';
import { completionRate } from '../../../src/lib/reputation.js';

describe('completionRate', () => {
  it('is null for traders with no closed trades', () => {
    expect(completionRate(0, 0)).toBeNull();
  });

  it('rounds to one decimal', () => {
    expect(completionRate(2, 3)).toBe(66.7);
    expect(completionRate(1, 3)).toBe(33.3);
  });

  it('covers the extremes', () => {
    expect(completionRate(10, 10)).toBe(100);
    expect(completionRate(0, 4)).toBe(0);
  });
});
