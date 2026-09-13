import { conflict, forbidden, unprocessable } from '../lib/errors.js';
import { isPast } from '../lib/time.js';

/*
 * Pure trade state rules — no database or network access, so they can be unit tested.
 *
 *   PENDING_ESCROW ─► ESCROW_LOCKED ─► PAID ─► RELEASING ─► COMPLETED
 *                          │                      ▲
 *                          ├──────────────────────┘ (seller may release early)
 *                          └─► REFUNDING ─► CANCELLED (buyer cancels / window expires)
 */

export const TRADE_ACTIONS = {
  MARK_PAID: { role: 'BUYER', from: ['ESCROW_LOCKED'], requiresOpenWindow: true },
  RELEASE: { role: 'SELLER', from: ['ESCROW_LOCKED', 'PAID'] },
  CANCEL: { role: 'BUYER', from: ['ESCROW_LOCKED'] },
};

export function resolveParties(order, takerId) {
  return order.type === 'SELL'
    ? { buyerId: takerId, sellerId: order.userId }
    : { buyerId: order.userId, sellerId: takerId };
}

export function roleOf(trade, userId) {
  if (trade.buyerId === userId) return 'BUYER';
  if (trade.sellerId === userId) return 'SELLER';
  return null;
}

export const humanStatus = (status) => status.toLowerCase().replace(/_/g, ' ');

export function assertCanAct(trade, action, userId, now = new Date()) {
  const rule = TRADE_ACTIONS[action];
  if (!rule) throw new Error(`Unknown trade action: ${action}`);

  const role = roleOf(trade, userId);
  if (!role) throw forbidden('You are not a party to this trade');
  if (role !== rule.role) throw forbidden(`Only the ${rule.role.toLowerCase()} can do this`);
  if (!rule.from.includes(trade.status)) {
    throw conflict(`This action is not available while the trade is ${humanStatus(trade.status)}`);
  }
  if (rule.requiresOpenWindow && isPast(trade.paymentDeadline, now)) {
    throw unprocessable('The payment window has closed', 'PAYMENT_WINDOW_CLOSED');
  }
  return role;
}

export function availableActions(trade, userId, now = new Date()) {
  return Object.keys(TRADE_ACTIONS).filter((action) => {
    try {
      assertCanAct(trade, action, userId, now);
      return true;
    } catch {
      return false;
    }
  });
}

export function isPaymentOverdue(trade, now = new Date()) {
  return trade.status === 'ESCROW_LOCKED' && isPast(trade.paymentDeadline, now);
}
