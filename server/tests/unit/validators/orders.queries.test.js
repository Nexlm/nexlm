import { describe, expect, it } from 'vitest';
import { listOrdersQuery, myOrdersQuery } from '../../../src/validators/orders.js';

describe('listOrdersQuery', () => {
  it('shows sell offers on the first page by default', () => {
    expect(listOrdersQuery.parse({})).toEqual({ type: 'SELL', page: 1, pageSize: 20 });
  });

  it('coerces query-string numbers', () => {
    expect(listOrdersQuery.parse({ page: '3', pageSize: '50' })).toMatchObject({ page: 3, pageSize: 50 });
  });

  it('validates filters', () => {
    expect(listOrdersQuery.parse({ paymentMethod: 'KUDA', minAmount: '100' })).toMatchObject({
      paymentMethod: 'KUDA',
      minAmount: '100',
    });
    expect(listOrdersQuery.safeParse({ minAmount: '-5' }).success).toBe(false);
    expect(listOrdersQuery.safeParse({ pageSize: '500' }).success).toBe(false);
  });
});

describe('myOrdersQuery', () => {
  it('filters by status', () => {
    expect(myOrdersQuery.parse({ status: 'EXPIRED' }).status).toBe('EXPIRED');
    expect(myOrdersQuery.safeParse({ status: 'DELETED' }).success).toBe(false);
  });
});
