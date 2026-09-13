import { describe, expect, it } from 'vitest';
import { completionRate, foldTradeStats } from '../src/lib/reputation.js';

describe('completionRate', () => {
  it('is null for traders with no closed trades', () => {
    expect(completionRate(0, 0)).toBeNull();
  });

  it('rounds to one decimal place', () => {
    expect(completionRate(2, 3)).toBe(66.7);
    expect(completionRate(10, 10)).toBe(100);
  });
});

describe('foldTradeStats', () => {
  it('merges buyer and seller rows per user', () => {
    const stats = foldTradeStats(
      ['u1', 'u2', 'u3'],
      [
        { userId: 'u1', status: 'COMPLETED', count: 8 },
        { userId: 'u1', status: 'CANCELLED', count: 1 },
        { userId: 'u1', status: 'COMPLETED', count: 1 },
        { userId: 'u2', status: 'CANCELLED', count: 2 },
        { userId: 'unknown', status: 'COMPLETED', count: 5 },
      ],
    );
    expect(stats.get('u1')).toEqual({ completedTrades: 9, completionRate: 90 });
    expect(stats.get('u2')).toEqual({ completedTrades: 0, completionRate: 0 });
    expect(stats.get('u3')).toEqual({ completedTrades: 0, completionRate: null });
    expect(stats.has('unknown')).toBe(false);
  });
});
