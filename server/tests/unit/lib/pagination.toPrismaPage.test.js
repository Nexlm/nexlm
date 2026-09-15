import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, toPrismaPage } from '../../../src/lib/pagination.js';

describe('toPrismaPage', () => {
  it('defaults to the first page', () => {
    expect(toPrismaPage()).toEqual({ skip: 0, take: DEFAULT_PAGE_SIZE, page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it('computes the offset', () => {
    expect(toPrismaPage({ page: 3, pageSize: 10 })).toMatchObject({ skip: 20, take: 10 });
  });

  it('caps the page size', () => {
    expect(toPrismaPage({ pageSize: 10_000 }).take).toBe(MAX_PAGE_SIZE);
  });

  it('recovers from junk query values', () => {
    expect(toPrismaPage({ page: 'abc', pageSize: 'x' })).toEqual(toPrismaPage());
    expect(toPrismaPage({ page: 0 }).page).toBe(1);
    expect(toPrismaPage({ page: -4 }).page).toBe(1);
  });

  it('floors fractional values', () => {
    expect(toPrismaPage({ page: 2.7, pageSize: 5.9 })).toMatchObject({ page: 2, pageSize: 5, skip: 5 });
  });
});
