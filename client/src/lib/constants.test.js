import { describe, expect, it } from 'vitest';
import {
  CANCEL_REASONS,
  KYC_STATUS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  paymentMethodLabel,
  TRADE_STATUS,
  USER_STATUS,
} from './constants.js';

const TONES = ['moss', 'mint', 'ember', 'gold', 'frost'];

describe('paymentMethodLabel', () => {
  it('uses human labels', () => {
    expect(paymentMethodLabel('BANK_TRANSFER')).toBe('Bank Transfer');
    expect(paymentMethodLabel('OPAY')).toBe('OPay');
  });

  it('falls back to the raw value for anything new from the API', () => {
    expect(paymentMethodLabel('FUTURE_RAIL')).toBe('FUTURE_RAIL');
  });
});

describe('status maps', () => {
  it('covers every trade status the API can return', () => {
    expect(Object.keys(TRADE_STATUS)).toEqual([
      'PENDING_ESCROW',
      'ESCROW_LOCKED',
      'PAID',
      'RELEASING',
      'REFUNDING',
      'COMPLETED',
      'CANCELLED',
    ]);
  });

  it('only uses tones the Badge component knows', () => {
    for (const map of [TRADE_STATUS, ORDER_STATUS, KYC_STATUS, USER_STATUS]) {
      for (const { label, tone } of Object.values(map)) {
        expect(label).toBeTruthy();
        expect(TONES).toContain(tone);
      }
    }
  });

  it('has a label for every payment method and cancel reason', () => {
    expect(PAYMENT_METHODS).toHaveLength(5);
    expect(PAYMENT_METHODS.every((m) => m.label && m.value)).toBe(true);
    expect(Object.keys(CANCEL_REASONS)).toEqual(['BUYER_CANCELLED', 'PAYMENT_TIMEOUT', 'ESCROW_FAILED']);
  });
});
