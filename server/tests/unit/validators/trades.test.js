import { describe, expect, it } from 'vitest';
import { myTradesQuery, openTradeBody, sendMessageBody } from '../../../src/validators/trades.js';

describe('openTradeBody', () => {
  it('requires an order and a supported payment method', () => {
    expect(openTradeBody.parse({ orderId: 'ord_1', paymentMethod: 'PALMPAY' })).toEqual({
      orderId: 'ord_1',
      paymentMethod: 'PALMPAY',
    });
    expect(openTradeBody.safeParse({ orderId: 'ord_1', paymentMethod: 'CASH' }).success).toBe(false);
    expect(openTradeBody.safeParse({ paymentMethod: 'OPAY' }).success).toBe(false);
  });
});

describe('myTradesQuery', () => {
  it('defaults to all trades', () => {
    expect(myTradesQuery.parse({})).toEqual({ scope: 'all', page: 1, pageSize: 20 });
  });

  it('rejects unknown scopes', () => {
    expect(myTradesQuery.safeParse({ scope: 'disputed' }).success).toBe(false);
  });
});

describe('sendMessageBody', () => {
  it('trims content', () => {
    expect(sendMessageBody.parse({ content: '  Sent via OPay  ' })).toEqual({ content: 'Sent via OPay' });
  });

  it('allows image-only messages', () => {
    expect(sendMessageBody.parse({})).toEqual({ content: undefined });
    expect(sendMessageBody.parse({ content: '' })).toEqual({ content: undefined });
  });

  it('limits message length', () => {
    expect(sendMessageBody.safeParse({ content: 'x'.repeat(2001) }).success).toBe(false);
  });
});
