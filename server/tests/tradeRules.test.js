import { describe, expect, it } from 'vitest';
import {
  assertCanAct,
  availableActions,
  isPaymentOverdue,
  resolveParties,
  roleOf,
  statusBeforeTransition,
} from '../src/services/tradeRules.js';

const now = new Date('2026-09-01T12:00:00Z');
const future = new Date('2026-09-01T12:10:00Z');
const past = new Date('2026-09-01T11:50:00Z');

const trade = (overrides = {}) => ({
  buyerId: 'buyer',
  sellerId: 'seller',
  status: 'ESCROW_LOCKED',
  paymentDeadline: future,
  ...overrides,
});

describe('resolveParties', () => {
  it('makes the taker the buyer on a sell order', () => {
    expect(resolveParties({ type: 'SELL', userId: 'maker' }, 'taker')).toEqual({ buyerId: 'taker', sellerId: 'maker' });
  });

  it('makes the taker the seller on a buy order', () => {
    expect(resolveParties({ type: 'BUY', userId: 'maker' }, 'taker')).toEqual({ buyerId: 'maker', sellerId: 'taker' });
  });
});

describe('roleOf', () => {
  it('identifies participants', () => {
    expect(roleOf(trade(), 'buyer')).toBe('BUYER');
    expect(roleOf(trade(), 'seller')).toBe('SELLER');
    expect(roleOf(trade(), 'stranger')).toBeNull();
  });
});

describe('assertCanAct', () => {
  it('lets the buyer mark paid inside the window', () => {
    expect(assertCanAct(trade(), 'MARK_PAID', 'buyer', now)).toBe('BUYER');
  });

  it('blocks marking paid after the window closes', () => {
    expect(() => assertCanAct(trade({ paymentDeadline: past }), 'MARK_PAID', 'buyer', now)).toThrow(
      'payment window has closed',
    );
  });

  it('only lets the seller release', () => {
    expect(() => assertCanAct(trade({ status: 'PAID' }), 'RELEASE', 'buyer', now)).toThrow('Only the seller');
    expect(assertCanAct(trade({ status: 'PAID' }), 'RELEASE', 'seller', now)).toBe('SELLER');
  });

  it('prevents the buyer cancelling after paying', () => {
    expect(() => assertCanAct(trade({ status: 'PAID' }), 'CANCEL', 'buyer', now)).toThrow('not available');
  });

  it('rejects outsiders and unknown actions', () => {
    expect(() => assertCanAct(trade(), 'RELEASE', 'stranger', now)).toThrow('not a party');
    expect(() => assertCanAct(trade(), 'EXPLODE', 'buyer', now)).toThrow('Unknown trade action');
  });

  it('does not allow actions on finished trades', () => {
    for (const status of ['COMPLETED', 'CANCELLED', 'RELEASING', 'REFUNDING']) {
      expect(availableActions(trade({ status }), 'buyer', now)).toEqual([]);
      expect(availableActions(trade({ status }), 'seller', now)).toEqual([]);
    }
  });
});

describe('availableActions', () => {
  it('lists what each party can do', () => {
    expect(availableActions(trade(), 'buyer', now)).toEqual(['MARK_PAID', 'CANCEL']);
    expect(availableActions(trade(), 'seller', now)).toEqual(['RELEASE']);
    expect(availableActions(trade({ status: 'PAID' }), 'buyer', now)).toEqual([]);
  });
});

describe('statusBeforeTransition', () => {
  it('restores PAID only when the buyer had marked payment', () => {
    expect(statusBeforeTransition(trade({ status: 'RELEASING', paidAt: now }))).toBe('PAID');
    expect(statusBeforeTransition(trade({ status: 'REFUNDING', paidAt: null }))).toBe('ESCROW_LOCKED');
  });
});

describe('isPaymentOverdue', () => {
  it('is true only for unpaid locked trades past the deadline', () => {
    expect(isPaymentOverdue(trade({ paymentDeadline: past }), now)).toBe(true);
    expect(isPaymentOverdue(trade(), now)).toBe(false);
    expect(isPaymentOverdue(trade({ status: 'PAID', paymentDeadline: past }), now)).toBe(false);
  });
});
