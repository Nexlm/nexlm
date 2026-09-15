import { describe, expect, it } from 'vitest';
import { foldTradeStats } from '../../../src/lib/reputation.js';

describe('foldTradeStats', () => {
  it('folds status counts per user', () => {
    const stats = foldTradeStats(
      ['ada', 'tunde'],
      [
        { userId: 'ada', status: 'COMPLETED', count: 9 },
        { userId: 'ada', status: 'CANCELLED', count: 1 },
        { userId: 'tunde', status: 'CANCELLED', count: 2 },
      ],
    );
    expect(stats.get('ada')).toEqual({ completedTrades: 9, completionRate: 90 });
    expect(stats.get('tunde')).toEqual({ completedTrades: 0, completionRate: 0 });
  });

  it('includes users with no rows', () => {
    expect(foldTradeStats(['new'], []).get('new')).toEqual({ completedTrades: 0, completionRate: null });
  });

  it('ignores rows for users that were not requested', () => {
    const stats = foldTradeStats(['ada'], [{ userId: 'stranger', status: 'COMPLETED', count: 5 }]);
    expect([...stats.keys()]).toEqual(['ada']);
  });
});
