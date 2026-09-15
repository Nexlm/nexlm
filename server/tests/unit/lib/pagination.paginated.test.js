import { describe, expect, it } from 'vitest';
import { paginated } from '../../../src/lib/pagination.js';

describe('paginated', () => {
  it('wraps items with page metadata', () => {
    expect(paginated(['a', 'b'], 45, { page: 2, pageSize: 20 })).toEqual({
      items: ['a', 'b'],
      pagination: { page: 2, pageSize: 20, total: 45, totalPages: 3, hasMore: true },
    });
  });

  it('reports one page when there are no results', () => {
    expect(paginated([], 0, { page: 1, pageSize: 20 }).pagination).toMatchObject({ totalPages: 1, hasMore: false });
  });

  it('has no more pages on an exact boundary', () => {
    expect(paginated([], 40, { page: 2, pageSize: 20 }).pagination.hasMore).toBe(false);
  });
});
