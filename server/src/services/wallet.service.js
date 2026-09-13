import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { ESCROW_OVERHEAD_XLM } from '../config/constants.js';
import { fromStroops, toStroops } from '../lib/amount.js';
import { unprocessable } from '../lib/errors.js';
import { paginated, toPrismaPage } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';
import { decryptSecret } from '../lib/secrets.js';
import { explorerAccountUrl, explorerTxUrl } from '../stellar/client.js';
import { sendXlm } from '../stellar/payments.js';
import { getPaymentHistory, getXlmBalance } from '../stellar/wallet.js';

/** XLM a user has promised through active sell orders (amount + escrow overhead each). */
export async function committedToSellOrders(userId) {
  const orders = await prisma.order.findMany({
    where: { userId, type: 'SELL', status: 'ACTIVE', expiresAt: { gt: new Date() } },
    select: { xlmAmount: true },
  });
  const total = orders.reduce(
    (sum, o) => sum + toStroops(o.xlmAmount) + toStroops(ESCROW_OVERHEAD_XLM),
    0n,
  );
  return fromStroops(total);
}

export async function getWalletSummary(user) {
  const [balance, committed] = await Promise.all([
    getXlmBalance(user.stellarPublicKey),
    committedToSellOrders(user.id),
  ]);

  const free = toStroops(balance.available) - toStroops(committed);

  return {
    publicKey: user.stellarPublicKey,
    network: env.STELLAR_NETWORK,
    explorerUrl: explorerAccountUrl(user.stellarPublicKey),
    ...balance,
    committedToOrders: committed,
    withdrawable: fromStroops(free > 0n ? free : 0n),
  };
}

export async function getDepositInfo(user) {
  const qrCode = await QRCode.toDataURL(user.stellarPublicKey, { margin: 1, width: 280 });
  return {
    publicKey: user.stellarPublicKey,
    network: env.STELLAR_NETWORK,
    qrCode,
    memoRequired: false,
    warning:
      env.STELLAR_NETWORK === 'testnet'
        ? 'This is a TESTNET wallet. Do not send real XLM to this address.'
        : 'Only send XLM on the Stellar network to this address.',
  };
}

export async function getActivity(user, { cursor }) {
  const { records, nextCursor } = await getPaymentHistory(user.stellarPublicKey, { cursor });
  return {
    items: records.map((r) => ({ ...r, explorerUrl: explorerTxUrl(r.txHash) })),
    nextCursor,
  };
}

export async function withdraw(userId, { destination, amount, memo }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, stellarPublicKey: true, stellarSecretEnc: true },
  });

  const summary = await getWalletSummary(user);
  if (toStroops(amount) > toStroops(summary.withdrawable)) {
    throw unprocessable(
      `Insufficient balance. You can withdraw up to ${summary.withdrawable} XLM.`,
      'INSUFFICIENT_BALANCE',
      { withdrawable: summary.withdrawable },
    );
  }

  const { txHash } = await sendXlm({
    sourceSecret: decryptSecret(user.stellarSecretEnc),
    destination,
    amount,
    memo,
  });

  await prisma.transaction.create({
    data: { userId, type: 'WITHDRAWAL', xlmAmount: amount, counterparty: destination, stellarTxHash: txHash },
  });

  return { txHash, explorerUrl: explorerTxUrl(txHash) };
}

export async function listTransactions(userId, query) {
  const { skip, take, page, pageSize } = toPrismaPage(query);
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.transaction.count({ where }),
  ]);
  return paginated(
    items.map((t) => ({ ...t, explorerUrl: explorerTxUrl(t.stellarTxHash) })),
    total,
    { page, pageSize },
  );
}
