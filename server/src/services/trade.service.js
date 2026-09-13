import { env } from '../config/env.js';
import { ESCROW_OVERHEAD_XLM, PAYMENT_METHOD_LABELS, TRADE_ACTIVE_STATUSES } from '../config/constants.js';
import { fromStroops, ngnTotal, toStroops } from '../lib/amount.js';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { paginated, toPrismaPage } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import { decryptSecret } from '../lib/secrets.js';
import { publicUserSelect } from '../lib/selects.js';
import { addMinutes, isPast, secondsUntil } from '../lib/time.js';
import { broadcast, emitToTrade, emitToUser } from '../socket/io.js';
import { accountExists, explorerTxUrl } from '../stellar/client.js';
import {
  createEscrowKeypair,
  ESCROW_MEMOS,
  findEscrowTransactions,
  lockEscrow,
  refundEscrow,
  releaseEscrow,
} from '../stellar/escrow.js';
import { getXlmBalance } from '../stellar/wallet.js';
import {
  assertCanAct,
  availableActions,
  isPaymentOverdue,
  resolveParties,
  roleOf,
  statusBeforeTransition,
} from './tradeRules.js';

const MAX_ACTIVE_TRADES = 5;

const participantSelect = { ...publicUserSelect, stellarPublicKey: true };

const tradeInclude = {
  buyer: { select: participantSelect },
  seller: { select: participantSelect },
  order: { select: { id: true, type: true, terms: true, userId: true } },
};

const formatXlm = (value) => fromStroops(toStroops(value));

const SCOPES = {
  active: { status: { in: TRADE_ACTIVE_STATUSES } },
  completed: { status: 'COMPLETED' },
  cancelled: { status: 'CANCELLED' },
  all: {},
};

// ── Helpers ────────────────────────────────────────────────────────────────

export async function loadTrade(id) {
  const trade = await prisma.trade.findUnique({ where: { id }, include: tradeInclude });
  if (!trade) throw notFound('Trade not found');
  return trade;
}

/** Loads a trade the user is allowed to see (a participant or an admin). */
export async function getTradeForViewer(user, id) {
  const trade = await loadTrade(id);
  if (!roleOf(trade, user.id) && user.role !== 'ADMIN') throw forbidden('You are not a party to this trade');
  return trade;
}

export async function postSystemMessage(tradeId, content, client = prisma) {
  const message = await client.message.create({ data: { tradeId, content, isSystem: true } });
  emitToTrade(tradeId, 'message:new', message);
  return message;
}

export function notifyParties(trade, event = 'trade:updated') {
  emitToTrade(trade.id, 'trade:updated', { id: trade.id, status: trade.status });
  for (const userId of [trade.buyerId, trade.sellerId]) {
    emitToUser(userId, event, { tradeId: trade.id, status: trade.status });
  }
}

async function reopenOrder(orderId) {
  const reopened = await prisma.order.updateMany({
    where: { id: orderId, status: 'FILLED', expiresAt: { gt: new Date() } },
    data: { status: 'ACTIVE' },
  });
  if (reopened.count) broadcast('order:created', { id: orderId });
}

/** Moves a trade into a transitional state; fails if someone else changed it first. */
async function claim(tradeId, fromStatuses, toStatus) {
  const result = await prisma.trade.updateMany({
    where: { id: tradeId, status: { in: fromStatuses } },
    data: { status: toStatus },
  });
  if (result.count === 0) throw conflict('This trade just changed. Refresh and try again.');
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function getTradeDetails(user, id) {
  const trade = await getTradeForViewer(user, id);

  const paymentAccount = await prisma.paymentAccount.findFirst({
    where: { userId: trade.sellerId, method: trade.paymentMethod },
    orderBy: { createdAt: 'asc' },
    select: { method: true, bankName: true, accountName: true, accountNumber: true },
  });

  return {
    ...trade,
    role: roleOf(trade, user.id),
    actions: availableActions(trade, user.id),
    paymentAccount,
    secondsRemaining: trade.status === 'ESCROW_LOCKED' ? secondsUntil(trade.paymentDeadline) : 0,
    links: {
      escrow: trade.escrowTxHash && explorerTxUrl(trade.escrowTxHash),
      release: trade.releaseTxHash && explorerTxUrl(trade.releaseTxHash),
      refund: trade.refundTxHash && explorerTxUrl(trade.refundTxHash),
    },
  };
}

export async function listMyTrades(userId, { scope, ...pageInput }) {
  const { skip, take, page, pageSize } = toPrismaPage(pageInput);
  const where = { OR: [{ buyerId: userId }, { sellerId: userId }], ...SCOPES[scope] };
  const [items, total] = await Promise.all([
    prisma.trade.findMany({ where, include: tradeInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.trade.count({ where }),
  ]);
  return paginated(
    items.map((t) => ({ ...t, role: roleOf(t, userId) })),
    total,
    { page, pageSize },
  );
}

// ── Finalizers (database side of an on-chain escrow operation) ────────────

async function finalizeLock(trade, { escrowPublicKey, txHash }) {
  const xlmAmount = formatXlm(trade.xlmAmount);
  const locked = await prisma.$transaction(async (tx) => {
    const updated = await tx.trade.update({
      where: { id: trade.id },
      data: {
        status: 'ESCROW_LOCKED',
        escrowPublicKey,
        escrowTxHash: txHash,
        // The payment window starts once funds are actually locked.
        paymentDeadline: addMinutes(new Date(), env.TRADE_PAYMENT_WINDOW_MINUTES),
      },
      include: tradeInclude,
    });
    await tx.transaction.create({
      data: {
        userId: trade.sellerId,
        tradeId: trade.id,
        type: 'ESCROW_LOCK',
        xlmAmount,
        counterparty: escrowPublicKey,
        stellarTxHash: txHash,
      },
    });
    await postSystemMessage(
      trade.id,
      `${xlmAmount} XLM is now locked in escrow. The buyer has ${env.TRADE_PAYMENT_WINDOW_MINUTES} minutes to send ₦${trade.ngnAmount} and mark the order as paid.`,
      tx,
    );
    return updated;
  });

  notifyParties(locked, 'trade:created');
  return locked;
}

async function finalizeRelease(trade, txHash) {
  const xlmAmount = formatXlm(trade.xlmAmount);
  const completed = await prisma.$transaction(async (tx) => {
    const updated = await tx.trade.update({
      where: { id: trade.id },
      data: { status: 'COMPLETED', releaseTxHash: txHash, completedAt: new Date() },
      include: tradeInclude,
    });
    await tx.transaction.create({
      data: {
        userId: trade.buyerId,
        tradeId: trade.id,
        type: 'ESCROW_RELEASE',
        xlmAmount,
        counterparty: trade.escrowPublicKey,
        stellarTxHash: txHash,
      },
    });
    await postSystemMessage(trade.id, `${xlmAmount} XLM has been released to the buyer. Trade complete.`, tx);
    return updated;
  });

  notifyParties(completed);
  return completed;
}

async function finalizeRefund(trade, txHash, { reason, message, reopen = true }) {
  const refunded = await prisma.$transaction(async (tx) => {
    const updated = await tx.trade.update({
      where: { id: trade.id },
      data: { status: 'CANCELLED', refundTxHash: txHash, cancelReason: reason, cancelledAt: new Date() },
      include: tradeInclude,
    });
    await tx.transaction.create({
      data: {
        userId: trade.sellerId,
        tradeId: trade.id,
        type: 'ESCROW_REFUND',
        xlmAmount: formatXlm(trade.xlmAmount),
        counterparty: trade.escrowPublicKey,
        stellarTxHash: txHash,
      },
    });
    await postSystemMessage(trade.id, message, tx);
    return updated;
  });

  if (reopen) await reopenOrder(trade.orderId);
  notifyParties(refunded);
  return refunded;
}

// ── Commands ───────────────────────────────────────────────────────────────

export async function openTrade(user, { orderId, paymentMethod }) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== 'ACTIVE' || isPast(order.expiresAt)) {
    throw notFound('This order is no longer available');
  }
  if (order.userId === user.id) throw badRequest('You cannot trade against your own order');
  if (!order.paymentMethods.includes(paymentMethod)) {
    throw badRequest('The advertiser does not accept this payment method');
  }

  const { buyerId, sellerId } = resolveParties(order, user.id);
  const takerIsSeller = sellerId === user.id;

  const activeTrades = await prisma.trade.count({
    where: { status: { in: TRADE_ACTIVE_STATUSES }, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
  });
  if (activeTrades >= MAX_ACTIVE_TRADES) {
    throw unprocessable(`Finish your open trades first (limit ${MAX_ACTIVE_TRADES})`, 'TOO_MANY_TRADES');
  }

  const payoutAccount = await prisma.paymentAccount.findFirst({ where: { userId: sellerId, method: paymentMethod } });
  if (!payoutAccount) {
    throw unprocessable(
      takerIsSeller
        ? `Add a ${PAYMENT_METHOD_LABELS[paymentMethod]} payout account before selling`
        : 'The seller has no payout account for this payment method',
      'PAYMENT_ACCOUNT_REQUIRED',
    );
  }

  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { id: true, status: true, stellarPublicKey: true, stellarSecretEnc: true },
  });
  if (seller.status !== 'ACTIVE') throw unprocessable('The seller account is not active', 'COUNTERPARTY_INACTIVE');

  const balance = await getXlmBalance(seller.stellarPublicKey);
  const needed = toStroops(order.xlmAmount) + toStroops(ESCROW_OVERHEAD_XLM);
  if (toStroops(balance.available) < needed) {
    throw unprocessable(
      takerIsSeller
        ? `You need ${fromStroops(needed)} XLM available (amount + ${ESCROW_OVERHEAD_XLM} XLM escrow overhead)`
        : 'The seller no longer has enough XLM to fund this order',
      'INSUFFICIENT_BALANCE',
    );
  }

  // Claim the order atomically so two takers can't match it at once.
  const claimed = await prisma.order.updateMany({ where: { id: order.id, status: 'ACTIVE' }, data: { status: 'FILLED' } });
  if (claimed.count === 0) throw conflict('Another trader just took this order');
  broadcast('order:removed', { id: order.id });

  const xlmAmount = formatXlm(order.xlmAmount);
  const escrowKeypair = createEscrowKeypair();

  // The escrow address is stored before submitting so funds are always traceable,
  // even if the lock succeeds on-chain but a later database write fails.
  const trade = await prisma.trade.create({
    data: {
      orderId: order.id,
      buyerId,
      sellerId,
      xlmAmount,
      ngnRate: order.ngnRate,
      ngnAmount: ngnTotal(order.xlmAmount, order.ngnRate),
      paymentMethod,
      escrowPublicKey: escrowKeypair.publicKey(),
      paymentDeadline: addMinutes(new Date(), env.TRADE_PAYMENT_WINDOW_MINUTES),
    },
  });

  let lock;
  try {
    lock = await lockEscrow({ sellerSecret: decryptSecret(seller.stellarSecretEnc), escrowKeypair, xlmAmount });
  } catch (err) {
    if (err.code === 'STELLAR_TX_FAILED') {
      // Definitive rejection — nothing moved on-chain, safe to roll back.
      await prisma.$transaction([
        prisma.trade.update({
          where: { id: trade.id },
          data: { status: 'CANCELLED', cancelReason: 'ESCROW_FAILED', cancelledAt: new Date() },
        }),
        prisma.order.update({ where: { id: order.id }, data: { status: 'ACTIVE' } }),
      ]);
      broadcast('order:created', { id: order.id });
    } else {
      // Outcome unknown (e.g. Horizon timeout). The reconcile job settles it.
      logger.error('Escrow lock outcome unknown', { tradeId: trade.id, err });
    }
    throw err;
  }

  return finalizeLock(trade, lock);
}

export async function markPaid(user, tradeId) {
  const trade = await loadTrade(tradeId);
  assertCanAct(trade, 'MARK_PAID', user.id);

  const result = await prisma.trade.updateMany({
    where: { id: tradeId, status: 'ESCROW_LOCKED', paymentDeadline: { gt: new Date() } },
    data: { status: 'PAID', paidAt: new Date() },
  });
  if (result.count === 0) throw conflict('This trade just changed. Refresh and try again.');

  await postSystemMessage(
    tradeId,
    'The buyer has marked the payment as sent. Seller: confirm the Naira is in your account before releasing XLM.',
  );

  const updated = await loadTrade(tradeId);
  notifyParties(updated);
  return updated;
}

export async function executeRelease(trade) {
  const previousStatus = trade.status;
  await claim(trade.id, [previousStatus], 'RELEASING');

  let txHash;
  try {
    ({ txHash } = await releaseEscrow({
      escrowPublicKey: trade.escrowPublicKey,
      buyerPublicKey: trade.buyer.stellarPublicKey,
      sellerPublicKey: trade.seller.stellarPublicKey,
      xlmAmount: formatXlm(trade.xlmAmount),
    }));
  } catch (err) {
    if (err.code === 'STELLAR_TX_FAILED') {
      await prisma.trade.update({ where: { id: trade.id }, data: { status: previousStatus } });
    } else {
      logger.error('Escrow release outcome unknown', { tradeId: trade.id, err });
    }
    throw err;
  }

  return finalizeRelease(trade, txHash);
}

export async function executeRefund(trade, options) {
  const previousStatus = trade.status;
  await claim(trade.id, [previousStatus], 'REFUNDING');

  let txHash;
  try {
    ({ txHash } = await refundEscrow({
      escrowPublicKey: trade.escrowPublicKey,
      sellerPublicKey: trade.seller.stellarPublicKey,
    }));
  } catch (err) {
    if (err.code === 'STELLAR_TX_FAILED') {
      await prisma.trade.update({ where: { id: trade.id }, data: { status: previousStatus } });
    } else {
      logger.error('Escrow refund outcome unknown', { tradeId: trade.id, err });
    }
    throw err;
  }

  return finalizeRefund(trade, txHash, options);
}

export async function releaseTrade(user, tradeId) {
  const trade = await loadTrade(tradeId);
  assertCanAct(trade, 'RELEASE', user.id);
  return executeRelease(trade);
}

export async function cancelTrade(user, tradeId) {
  const trade = await loadTrade(tradeId);
  assertCanAct(trade, 'CANCEL', user.id);
  return executeRefund(trade, {
    reason: 'BUYER_CANCELLED',
    message: 'The buyer cancelled the trade. Escrowed XLM has been returned to the seller.',
  });
}

/** Called by the scheduler for trades whose payment window elapsed without payment. */
export async function expireTrade(tradeId) {
  const trade = await loadTrade(tradeId);
  if (!isPaymentOverdue(trade)) return null;
  return executeRefund(trade, {
    reason: 'PAYMENT_TIMEOUT',
    message: 'The payment window expired without payment. Escrowed XLM has been returned to the seller.',
  });
}

/**
 * Settles a trade left in PENDING_ESCROW, RELEASING or REFUNDING after an
 * unknown outcome, by checking what actually happened on-chain.
 */
export async function reconcileTrade(tradeId) {
  const trade = await loadTrade(tradeId);
  if (!['PENDING_ESCROW', 'RELEASING', 'REFUNDING'].includes(trade.status) || !trade.escrowPublicKey) return null;

  const [exists, transactions] = await Promise.all([
    accountExists(trade.escrowPublicKey),
    findEscrowTransactions(trade.escrowPublicKey),
  ]);
  const withMemo = (memo) => transactions.find((t) => t.memo === memo);

  if (trade.status === 'PENDING_ESCROW') {
    const lock = withMemo(ESCROW_MEMOS.lock);
    if (exists && lock) return finalizeLock(trade, { escrowPublicKey: trade.escrowPublicKey, txHash: lock.hash });
    if (exists) return null;

    const cancelled = await prisma.trade.update({
      where: { id: trade.id },
      data: { status: 'CANCELLED', cancelReason: 'ESCROW_FAILED', cancelledAt: new Date() },
      include: tradeInclude,
    });
    await reopenOrder(trade.orderId);
    await postSystemMessage(trade.id, 'Escrow could not be funded, so this trade was cancelled. No XLM moved.');
    notifyParties(cancelled);
    return cancelled;
  }

  const closing = withMemo(trade.status === 'RELEASING' ? ESCROW_MEMOS.release : ESCROW_MEMOS.refund);

  if (!exists && closing) {
    return trade.status === 'RELEASING'
      ? finalizeRelease(trade, closing.hash)
      : finalizeRefund(trade, closing.hash, {
          reason: trade.cancelReason ?? 'PAYMENT_TIMEOUT',
          message: 'Escrowed XLM has been returned to the seller.',
          reopen: false,
        });
  }

  if (exists) {
    // The transaction expired without landing; put the trade back so it can be retried.
    const restored = await prisma.trade.update({
      where: { id: trade.id },
      data: { status: statusBeforeTransition(trade) },
      include: tradeInclude,
    });
    notifyParties(restored);
    return restored;
  }

  logger.error('Escrow closed without a recognised transaction', { tradeId: trade.id });
  return null;
}
