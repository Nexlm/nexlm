import { describe, expect, it } from 'vitest';
import { MAX_PAGE_SIZE, paginated, toPrismaPage } from '../src/lib/pagination.js';

describe('toPrismaPage', () => {
  it('computes skip/take', () => {
    expect(toPrismaPage({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10, page: 3, pageSize: 10 });
  });

  it('clamps invalid input', () => {
    expect(toPrismaPage({ page: 0, pageSize: 1000 })).toMatchObject({ page: 1, take: MAX_PAGE_SIZE });
    expect(toPrismaPage({ page: 'x', pageSize: -5 })).toMatchObject({ page: 1, take: 1 });
    expect(toPrismaPage()).toMatchObject({ page: 1, take: 20 });
  });
});

describe('paginated', () => {
  it('reports totals and whether more pages exist', () => {
    const result = paginated(['a', 'b'], 5, { page: 2, pageSize: 2 });
    expect(result.pagination).toEqual({ page: 2, pageSize: 2, total: 5, totalPages: 3, hasMore: true });
  });

  it('always reports at least one page', () => {
    expect(paginated([], 0, { page: 1, pageSize: 20 }).pagination).toMatchObject({ totalPages: 1, hasMore: false });
  });
});
