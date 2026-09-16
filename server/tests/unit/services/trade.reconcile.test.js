import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => {
  const prisma = {
    trade: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    order: { updateMany: vi.fn(async () => ({ count: 0 })) },
    message: { create: vi.fn(async ({ data }) => data) },
    transaction: { create: vi.fn() },
    $transaction: vi.fn(async (arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
  };
  return { prisma };
});
vi.mock('../../../src/socket/io.js', () => ({ broadcast: vi.fn(), emitToTrade: vi.fn(), emitToUser: vi.fn() }));
vi.mock('../../../src/stellar/client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  accountExists: vi.fn(),
}));
vi.mock('../../../src/stellar/escrow.js', async () => {
  const ESCROW_MEMOS = { lock: 'nexlm escrow lock', release: 'nexlm escrow release', refund: 'nexlm escrow refund' };
  return {
    ESCROW_MEMOS,
    createEscrowKeypair: vi.fn(),
    lockEscrow: vi.fn(),
    releaseEscrow: vi.fn(),
    refundEscrow: vi.fn(),
    findEscrowTransactions: vi.fn(),
  };
});
vi.mock('../../../src/stellar/wallet.js', () => ({ getXlmBalance: vi.fn() }));
vi.mock('../../../src/lib/secrets.js', () => ({ decryptSecret: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { accountExists } = await import('../../../src/stellar/client.js');
const { ESCROW_MEMOS, findEscrowTransactions, refundEscrow } = await import('../../../src/stellar/escrow.js');
const { expireTrade, reconcileTrade } = await import('../../../src/services/trade.service.js');

const trade = (overrides = {}) => ({
  id: 'trd_1',
  orderId: 'ord_1',
  buyerId: 'buyer',
  sellerId: 'seller',
  status: 'PENDING_ESCROW',
  xlmAmount: '250',
  ngnAmount: '375000.00',
  escrowPublicKey: 'GESCROW',
  paymentDeadline: new Date(Date.now() + 600_000),
  buyer: { stellarPublicKey: 'GBUYER' },
  seller: { stellarPublicKey: 'GSELLER' },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.trade.updateMany.mockResolvedValue({ count: 1 });
  prisma.trade.update.mockImplementation(async ({ data }) => ({ ...trade(), ...data }));
  prisma.order.updateMany.mockResolvedValue({ count: 0 });
  findEscrowTransactions.mockResolvedValue([]);
  refundEscrow.mockResolvedValue({ txHash: 'refund-hash' });
});

describe('expireTrade', () => {
  it('refunds the seller once the payment window has passed', async () => {
    prisma.trade.findUnique.mockResolvedValue(
      trade({ status: 'ESCROW_LOCKED', paymentDeadline: new Date(Date.now() - 1000) }),
    );
    const result = await expireTrade('trd_1');
    expect(refundEscrow).toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'CANCELLED', cancelReason: 'PAYMENT_TIMEOUT' });
  });

  it('does nothing while the window is still open', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'ESCROW_LOCKED' }));
    expect(await expireTrade('trd_1')).toBeNull();
    expect(refundEscrow).not.toHaveBeenCalled();
  });

  it('does nothing once the buyer has paid', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'PAID', paymentDeadline: new Date(Date.now() - 1000) }));
    expect(await expireTrade('trd_1')).toBeNull();
  });
});

describe('reconcileTrade for a pending lock', () => {
  it('completes the lock when the escrow exists and the lock landed', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade());
    accountExists.mockResolvedValue(true);
    findEscrowTransactions.mockResolvedValue([{ hash: 'lock-hash', memo: ESCROW_MEMOS.lock }]);

    const result = await reconcileTrade('trd_1');
    expect(result).toMatchObject({ status: 'ESCROW_LOCKED', escrowTxHash: 'lock-hash' });
  });

  it('waits when the escrow exists but no lock transaction is visible yet', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade());
    accountExists.mockResolvedValue(true);
    expect(await reconcileTrade('trd_1')).toBeNull();
  });

  it('cancels and reopens the order when the escrow was never funded', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade());
    accountExists.mockResolvedValue(false);

    const result = await reconcileTrade('trd_1');
    expect(result).toMatchObject({ status: 'CANCELLED', cancelReason: 'ESCROW_FAILED' });
    expect(prisma.order.updateMany).toHaveBeenCalled();
    expect(prisma.message.create.mock.calls[0][0].data.content).toContain('No XLM moved');
  });
});

describe('reconcileTrade for a stuck release or refund', () => {
  it('completes a release that landed after the escrow was merged away', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'RELEASING' }));
    accountExists.mockResolvedValue(false);
    findEscrowTransactions.mockResolvedValue([{ hash: 'release-hash', memo: ESCROW_MEMOS.release }]);

    expect(await reconcileTrade('trd_1')).toMatchObject({ status: 'COMPLETED', releaseTxHash: 'release-hash' });
  });

  it('completes a refund that landed', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'REFUNDING', cancelReason: 'BUYER_CANCELLED' }));
    accountExists.mockResolvedValue(false);
    findEscrowTransactions.mockResolvedValue([{ hash: 'refund-hash', memo: ESCROW_MEMOS.refund }]);

    const result = await reconcileTrade('trd_1');
    expect(result).toMatchObject({ status: 'CANCELLED', refundTxHash: 'refund-hash' });
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('puts the trade back so it can be retried when the transaction never landed', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'RELEASING', paidAt: new Date() }));
    accountExists.mockResolvedValue(true);

    expect(await reconcileTrade('trd_1')).toMatchObject({ status: 'PAID' });
  });

  it('falls back to awaiting payment when the buyer had not paid', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'REFUNDING', paidAt: null }));
    accountExists.mockResolvedValue(true);

    expect(await reconcileTrade('trd_1')).toMatchObject({ status: 'ESCROW_LOCKED' });
  });

  it('ignores trades that are not in a transitional state', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'COMPLETED' }));
    expect(await reconcileTrade('trd_1')).toBeNull();
    expect(accountExists).not.toHaveBeenCalled();
  });

  it('ignores trades with no escrow address', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ escrowPublicKey: null }));
    expect(await reconcileTrade('trd_1')).toBeNull();
  });
});
