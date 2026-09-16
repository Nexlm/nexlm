import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => {
  const prisma = {
    order: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    trade: { count: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    paymentAccount: { findFirst: vi.fn() },
    message: { create: vi.fn(async ({ data }) => data) },
    transaction: { create: vi.fn() },
    $transaction: vi.fn(async (arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
  };
  return { prisma };
});
vi.mock('../../../src/socket/io.js', () => ({ broadcast: vi.fn(), emitToTrade: vi.fn(), emitToUser: vi.fn() }));
vi.mock('../../../src/stellar/escrow.js', () => ({
  createEscrowKeypair: vi.fn(() => ({ publicKey: () => 'GESCROW' })),
  lockEscrow: vi.fn(),
  releaseEscrow: vi.fn(),
  refundEscrow: vi.fn(),
  findEscrowTransactions: vi.fn(),
  ESCROW_MEMOS: { lock: 'nexlm escrow lock', release: 'nexlm escrow release', refund: 'nexlm escrow refund' },
}));
vi.mock('../../../src/stellar/wallet.js', () => ({ getXlmBalance: vi.fn() }));
vi.mock('../../../src/lib/secrets.js', () => ({ decryptSecret: vi.fn(() => 'SSECRET') }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { broadcast } = await import('../../../src/socket/io.js');
const { getXlmBalance } = await import('../../../src/stellar/wallet.js');
const { lockEscrow } = await import('../../../src/stellar/escrow.js');
const { logger } = await import('../../../src/lib/logger.js');
const { openTrade } = await import('../../../src/services/trade.service.js');

const open = () => openTrade({ id: 'buyer' }, { orderId: 'ord_1', paymentMethod: 'OPAY' });

beforeEach(() => {
  vi.clearAllMocks();
  prisma.order.findUnique.mockResolvedValue({
    id: 'ord_1',
    userId: 'seller',
    type: 'SELL',
    status: 'ACTIVE',
    xlmAmount: '250',
    ngnRate: '1500',
    paymentMethods: ['OPAY'],
    expiresAt: new Date(Date.now() + 600_000),
  });
  prisma.trade.count.mockResolvedValue(0);
  prisma.paymentAccount.findFirst.mockResolvedValue({ id: 'pa_1' });
  prisma.user.findUnique.mockResolvedValue({ id: 'seller', status: 'ACTIVE', stellarPublicKey: 'GSELLER', stellarSecretEnc: 'enc' });
  getXlmBalance.mockResolvedValue({ available: '1000' });
  prisma.order.updateMany.mockResolvedValue({ count: 1 });
  prisma.trade.create.mockImplementation(async ({ data }) => ({ id: 'trd_1', ...data }));
  prisma.$transaction.mockImplementation(async (arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma)));
});

describe('when Stellar rejects the escrow lock', () => {
  beforeEach(() => {
    lockEscrow.mockRejectedValue(Object.assign(new Error('tx_failed'), { code: 'STELLAR_TX_FAILED' }));
  });

  it('cancels the trade and puts the order back on the market', async () => {
    await expect(open()).rejects.toMatchObject({ code: 'STELLAR_TX_FAILED' });

    expect(prisma.trade.update).toHaveBeenCalledWith({
      where: { id: 'trd_1' },
      data: expect.objectContaining({ status: 'CANCELLED', cancelReason: 'ESCROW_FAILED' }),
    });
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'ord_1' }, data: { status: 'ACTIVE' } });
    expect(broadcast).toHaveBeenCalledWith('order:created', { id: 'ord_1' });
  });

  it('never marks the trade as locked', async () => {
    await expect(open()).rejects.toThrow();
    const statuses = prisma.trade.update.mock.calls.map((c) => c[0].data.status);
    expect(statuses).not.toContain('ESCROW_LOCKED');
  });
});

describe('when the escrow outcome is unknown', () => {
  it('leaves the trade for reconciliation instead of rolling back', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});
    lockEscrow.mockRejectedValue(Object.assign(new Error('timeout'), { code: 'HORIZON_UNAVAILABLE' }));

    await expect(open()).rejects.toMatchObject({ code: 'HORIZON_UNAVAILABLE' });
    expect(prisma.trade.update).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('keeps the escrow address on the trade so the funds stay traceable', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    lockEscrow.mockRejectedValue(Object.assign(new Error('timeout'), { code: 'HORIZON_UNAVAILABLE' }));

    await expect(open()).rejects.toThrow();
    expect(prisma.trade.create.mock.calls[0][0].data.escrowPublicKey).toBe('GESCROW');
    vi.restoreAllMocks();
  });
});
