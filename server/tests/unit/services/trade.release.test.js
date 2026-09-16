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
vi.mock('../../../src/stellar/escrow.js', () => ({
  createEscrowKeypair: vi.fn(),
  lockEscrow: vi.fn(),
  releaseEscrow: vi.fn(),
  refundEscrow: vi.fn(),
  findEscrowTransactions: vi.fn(),
  ESCROW_MEMOS: { lock: 'lock', release: 'release', refund: 'refund' },
}));
vi.mock('../../../src/stellar/wallet.js', () => ({ getXlmBalance: vi.fn() }));
vi.mock('../../../src/lib/secrets.js', () => ({ decryptSecret: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { releaseEscrow, refundEscrow } = await import('../../../src/stellar/escrow.js');
const { cancelTrade, releaseTrade } = await import('../../../src/services/trade.service.js');

const trade = (overrides = {}) => ({
  id: 'trd_1',
  orderId: 'ord_1',
  buyerId: 'buyer',
  sellerId: 'seller',
  status: 'PAID',
  xlmAmount: '250',
  escrowPublicKey: 'GESCROW',
  paymentDeadline: new Date(Date.now() + 600_000),
  buyer: { stellarPublicKey: 'GBUYER' },
  seller: { stellarPublicKey: 'GSELLER' },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.trade.findUnique.mockResolvedValue(trade());
  prisma.trade.updateMany.mockResolvedValue({ count: 1 });
  prisma.trade.update.mockImplementation(async ({ data }) => ({ ...trade(), ...data }));
  prisma.order.updateMany.mockResolvedValue({ count: 0 });
  releaseEscrow.mockResolvedValue({ txHash: 'release-hash' });
  refundEscrow.mockResolvedValue({ txHash: 'refund-hash' });
});

describe('releaseTrade', () => {
  it('pays the buyer and completes the trade', async () => {
    const result = await releaseTrade({ id: 'seller' }, 'trd_1');

    expect(releaseEscrow).toHaveBeenCalledWith({
      escrowPublicKey: 'GESCROW',
      buyerPublicKey: 'GBUYER',
      sellerPublicKey: 'GSELLER',
      xlmAmount: '250',
    });
    expect(result).toMatchObject({ status: 'COMPLETED', releaseTxHash: 'release-hash' });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'ESCROW_RELEASE', userId: 'buyer' }),
    });
  });

  it('claims the trade before touching Stellar', async () => {
    await releaseTrade({ id: 'seller' }, 'trd_1');
    expect(prisma.trade.updateMany).toHaveBeenCalledWith({
      where: { id: 'trd_1', status: { in: ['PAID'] } },
      data: { status: 'RELEASING' },
    });
  });

  it('only the seller can release', async () => {
    await expect(releaseTrade({ id: 'buyer' }, 'trd_1')).rejects.toMatchObject({ status: 403 });
    expect(releaseEscrow).not.toHaveBeenCalled();
  });

  it('lets the seller release early, before the buyer marks payment', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'ESCROW_LOCKED' }));
    await expect(releaseTrade({ id: 'seller' }, 'trd_1')).resolves.toMatchObject({ status: 'COMPLETED' });
  });

  it('restores the previous status when Stellar rejects the release', async () => {
    releaseEscrow.mockRejectedValue(Object.assign(new Error('tx_failed'), { code: 'STELLAR_TX_FAILED' }));
    await expect(releaseTrade({ id: 'seller' }, 'trd_1')).rejects.toThrow();
    expect(prisma.trade.update).toHaveBeenCalledWith({ where: { id: 'trd_1' }, data: { status: 'PAID' } });
  });

  it('leaves the trade RELEASING when the outcome is unknown', async () => {
    releaseEscrow.mockRejectedValue(Object.assign(new Error('timeout'), { code: 'HORIZON_UNAVAILABLE' }));
    await expect(releaseTrade({ id: 'seller' }, 'trd_1')).rejects.toThrow();
    expect(prisma.trade.update).not.toHaveBeenCalled();
  });

  it('refuses when someone else already changed the trade', async () => {
    prisma.trade.updateMany.mockResolvedValue({ count: 0 });
    await expect(releaseTrade({ id: 'seller' }, 'trd_1')).rejects.toMatchObject({ status: 409 });
    expect(releaseEscrow).not.toHaveBeenCalled();
  });
});

describe('cancelTrade', () => {
  beforeEach(() => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'ESCROW_LOCKED' }));
  });

  it('refunds the seller and records why', async () => {
    const result = await cancelTrade({ id: 'buyer' }, 'trd_1');
    expect(refundEscrow).toHaveBeenCalledWith({ escrowPublicKey: 'GESCROW', sellerPublicKey: 'GSELLER' });
    expect(result).toMatchObject({ status: 'CANCELLED', cancelReason: 'BUYER_CANCELLED', refundTxHash: 'refund-hash' });
  });

  it('puts the order back on the market if it has not expired', async () => {
    await cancelTrade({ id: 'buyer' }, 'trd_1');
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', status: 'FILLED', expiresAt: { gt: expect.any(Date) } },
      data: { status: 'ACTIVE' },
    });
  });

  it('only the buyer can cancel, and not after paying', async () => {
    await expect(cancelTrade({ id: 'seller' }, 'trd_1')).rejects.toMatchObject({ status: 403 });

    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'PAID' }));
    await expect(cancelTrade({ id: 'buyer' }, 'trd_1')).rejects.toMatchObject({ status: 409 });
  });
});
