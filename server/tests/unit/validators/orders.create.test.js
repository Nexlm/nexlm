import { describe, expect, it } from 'vitest';
import { createOrderBody } from '../../../src/validators/orders.js';

const valid = { type: 'SELL', xlmAmount: '250', ngnRate: '612.40', paymentMethods: ['OPAY'] };

describe('createOrderBody', () => {
  it('parses a sell order', () => {
    expect(createOrderBody.parse(valid)).toEqual({ ...valid, terms: undefined });
  });

  it('removes duplicate payment methods', () => {
    expect(createOrderBody.parse({ ...valid, paymentMethods: ['OPAY', 'KUDA', 'OPAY'] }).paymentMethods).toEqual([
      'OPAY',
      'KUDA',
    ]);
  });

  it('requires at least one payment method', () => {
    expect(createOrderBody.safeParse({ ...valid, paymentMethods: [] }).success).toBe(false);
  });

  it('treats blank terms as none', () => {
    expect(createOrderBody.parse({ ...valid, terms: '   ' }).terms).toBeUndefined();
  });

  it('limits terms to 500 characters', () => {
    expect(createOrderBody.safeParse({ ...valid, terms: 'x'.repeat(501) }).success).toBe(false);
  });

  it('only accepts BUY or SELL', () => {
    expect(createOrderBody.safeParse({ ...valid, type: 'SWAP' }).success).toBe(false);
  });
});
