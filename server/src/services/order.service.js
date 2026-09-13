import { env } from '../config/env.js';
import { ESCROW_OVERHEAD_XLM, PAYMENT_METHOD_LABELS } from '../config/constants.js';
import { fromStroops, toStroops } from '../lib/amount.js';
import { conflict, forbidden, notFound, unprocessable } from '../lib/errors.js';
import { paginated, toPrismaPage } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import { publicUserSelect } from '../lib/selects.js';
import { addMinutes, isPast } from '../lib/time.js';
import { broadcast } from '../socket/io.js';
import { getXlmBalance } from '../stellar/wallet.js';
import { withUserStats } from './reputation.service.js';
import { committedToSellOrders } from './wallet.service.js';

const MAX_ACTIVE_ORDERS = 10;

const orderInclude = { user: { select: publicUserSelect } };

function assertSizeInRange(xlmAmount) {
  const value = Number(xlmAmount);
  if (value < env.MIN_TRADE_XLM || value > env.MAX_TRADE_XLM) {
    throw unprocessable(
      `Order size must be between ${env.MIN_TRADE_XLM} and ${env.MAX_TRADE_XLM} XLM`,
      'ORDER_SIZE_OUT_OF_RANGE',
    );
  }
}

async function assertHasPaymentAccounts(userId, methods) {
  const accounts = await prisma.paymentAccount.findMany({
    where: { userId, method: { in: methods } },
    select: { method: true },
  });
  const have = new Set(accounts.map((a) => a.method));
  const missing = methods.filter((m) => !have.has(m));
  if (missing.length) {
    throw unprocessable(
      `Add a payout account for ${missing.map((m) => PAYMENT_METHOD_LABELS[m]).join(', ')} before posting a sell order`,
      'PAYMENT_ACCOUNT_REQUIRED',
      { missing },
    );
  }
}

async function assertCanCoverSell(user, xlmAmount) {
  const [balance, committed] = await Promise.all([
    getXlmBalance(user.stellarPublicKey),
    committedToSellOrders(user.id),
  ]);
  const needed = toStroops(committed) + toStroops(xlmAmount) + toStroops(ESCROW_OVERHEAD_XLM);
  if (toStroops(balance.available) < needed) {
    throw unprocessable(
      `Insufficient XLM. Each sell order needs the amount plus ${ESCROW_OVERHEAD_XLM} XLM escrow overhead, and you have ${committed} XLM committed to other orders.`,
      'INSUFFICIENT_BALANCE',
      { available: balance.available, committed, needed: fromStroops(needed) },
    );
  }
}

export async function createOrder(user, { type, xlmAmount, ngnRate, paymentMethods, terms }) {
  assertSizeInRange(xlmAmount);

  const activeCount = await prisma.order.count({ where: { userId: user.id, status: 'ACTIVE' } });
  if (activeCount >= MAX_ACTIVE_ORDERS) {
    throw unprocessable(`You can have at most ${MAX_ACTIVE_ORDERS} active orders`, 'TOO_MANY_ORDERS');
  }

  if (type === 'SELL') {
    await assertHasPaymentAccounts(user.id, paymentMethods);
    await assertCanCoverSell(user, xlmAmount);
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      type,
      xlmAmount,
      ngnRate,
      paymentMethods,
      terms,
      expiresAt: addMinutes(new Date(), env.ORDER_TTL_MINUTES),
    },
    include: orderInclude,
  });

  broadcast('order:created', { id: order.id, type: order.type });
  return order;
}

export async function listOrders({ type, paymentMethod, minAmount, ...pageInput }) {
  const { skip, take, page, pageSize } = toPrismaPage(pageInput);
  const where = {
    type,
    status: 'ACTIVE',
    expiresAt: { gt: new Date() },
    user: { status: 'ACTIVE' },
    ...(paymentMethod && { paymentMethods: { has: paymentMethod } }),
    ...(minAmount && { xlmAmount: { gte: minAmount } }),
  };

  // Best price first: cheapest sellers for buyers, highest bidders for sellers.
  const orderBy = [{ ngnRate: type === 'SELL' ? 'asc' : 'desc' }, { createdAt: 'asc' }];

  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy, skip, take, include: orderInclude }),
    prisma.order.count({ where }),
  ]);

  return paginated(await withUserStats(items), total, { page, pageSize });
}

export async function getOrder(id) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw notFound('Order not found');
  const [withStats] = await withUserStats([order]);
  return withStats;
}

export async function listMyOrders(userId, { status, ...pageInput }) {
  const { skip, take, page, pageSize } = toPrismaPage(pageInput);
  const where = { userId, ...(status && { status }) };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { _count: { select: { trades: true } } },
    }),
    prisma.order.count({ where }),
  ]);
  return paginated(items, total, { page, pageSize });
}

export async function cancelOrder(userId, id) {
  const order = await prisma.order.findUnique({ where: { id }, select: { userId: true, status: true, expiresAt: true } });
  if (!order) throw notFound('Order not found');
  if (order.userId !== userId) throw forbidden('You can only cancel your own orders');
  if (order.status !== 'ACTIVE' || isPast(order.expiresAt)) {
    throw conflict('Only active orders can be cancelled');
  }

  const result = await prisma.order.updateMany({ where: { id, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
  if (result.count === 0) throw conflict('This order was just matched and can no longer be cancelled');

  broadcast('order:removed', { id });
  return prisma.order.findUnique({ where: { id } });
}
