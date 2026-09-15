import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { activityQuery, withdrawBody } from '../../../src/validators/wallet.js';

const destination = Keypair.random().publicKey();

describe('withdrawBody', () => {
  it('parses a withdrawal with a memo', () => {
    expect(withdrawBody.parse({ destination, amount: '50', memo: ' 104829 ' })).toEqual({
      destination,
      amount: '50',
      memo: '104829',
    });
  });

  it('drops blank memos', () => {
    expect(withdrawBody.parse({ destination, amount: '50', memo: '' }).memo).toBeUndefined();
  });

  it('limits memos to 28 bytes, counting multi-byte characters', () => {
    expect(withdrawBody.safeParse({ destination, amount: '50', memo: 'x'.repeat(28) }).success).toBe(true);
    expect(withdrawBody.safeParse({ destination, amount: '50', memo: '₦'.repeat(10) }).success).toBe(false);
  });

  it('rejects invalid destinations and amounts', () => {
    expect(withdrawBody.safeParse({ destination: 'GABC', amount: '50' }).success).toBe(false);
    expect(withdrawBody.safeParse({ destination, amount: '0' }).success).toBe(false);
  });
});

describe('activityQuery', () => {
  it('accepts an optional Horizon cursor', () => {
    expect(activityQuery.parse({})).toEqual({});
    expect(activityQuery.parse({ cursor: '123456789-1' })).toEqual({ cursor: '123456789-1' });
    expect(activityQuery.safeParse({ cursor: '9'.repeat(65) }).success).toBe(false);
  });
});
