import { describe, expect, it } from 'vitest';
import { kycDecisionBody, listTradesQuery, listUsersQuery, updateUserStatusBody } from '../../../src/validators/admin.js';

describe('listUsersQuery', () => {
  it('trims search and applies paging defaults', () => {
    expect(listUsersQuery.parse({ q: '  ada ' })).toEqual({ q: 'ada', page: 1, pageSize: 20 });
  });

  it('validates status filters', () => {
    expect(listUsersQuery.parse({ status: 'SUSPENDED', kycStatus: 'PENDING' })).toMatchObject({
      status: 'SUSPENDED',
      kycStatus: 'PENDING',
    });
    expect(listUsersQuery.safeParse({ kycStatus: 'MAYBE' }).success).toBe(false);
  });
});

describe('updateUserStatusBody', () => {
  it('only allows known statuses', () => {
    expect(updateUserStatusBody.safeParse({ status: 'BANNED' }).success).toBe(true);
    expect(updateUserStatusBody.safeParse({ status: 'DELETED' }).success).toBe(false);
  });
});

describe('kycDecisionBody', () => {
  it('accepts approve or reject', () => {
    expect(kycDecisionBody.parse({ decision: 'APPROVE' })).toEqual({ decision: 'APPROVE' });
    expect(kycDecisionBody.safeParse({ decision: 'approve' }).success).toBe(false);
  });
});

describe('listTradesQuery', () => {
  it('filters by every trade status', () => {
    for (const status of ['PENDING_ESCROW', 'ESCROW_LOCKED', 'PAID', 'RELEASING', 'REFUNDING', 'COMPLETED', 'CANCELLED']) {
      expect(listTradesQuery.parse({ status }).status).toBe(status);
    }
  });
});
