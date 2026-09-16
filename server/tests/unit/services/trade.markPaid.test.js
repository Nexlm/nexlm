import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => {
  const prisma = {
    trade: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    order: { updateMany: vi.fn() },
    message: { create: vi.fn(async ({ data }) => data) },
    transaction: { create: vi.fn() },
    paymentAccount: { findFirst: vi.fn() },
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
const { emitToTrade, emitToUser } = await import('../../../src/socket/io.js');
const { markPaid } = await import('../../../src/services/trade.service.js');

const trade = (overrides = {}) => ({
  id: 'trd_1',
  buyerId: 'buyer',
  sellerId: 'seller',
  status: 'ESCROW_LOCKED',
  paymentDeadline: new Date(Date.now() + 600_000),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.trade.findUnique.mockResolvedValue(trade());
  prisma.trade.updateMany.mockResolvedValue({ count: 1 });
});

describe('markPaid', () => {
  it('moves the trade to PAID and stamps the time', async () => {
    await markPaid({ id: 'buyer' }, 'trd_1');
    const { where, data } = prisma.trade.updateMany.mock.calls[0][0];
    expect(where).toMatchObject({ id: 'trd_1', status: 'ESCROW_LOCKED' });
    expect(where.paymentDeadline.gt).toBeInstanceOf(Date);
    expect(data.status).toBe('PAID');
    expect(data.paidAt).toBeInstanceOf(Date);
  });

  it('tells the seller to confirm the Naira before releasing', async () => {
    await markPaid({ id: 'buyer' }, 'trd_1');
    expect(prisma.message.create.mock.calls[0][0].data).toMatchObject({
      tradeId: 'trd_1',
      isSystem: true,
      content: expect.stringContaining('confirm the Naira'),
    });
    expect(emitToTrade).toHaveBeenCalled();
    expect(emitToUser).toHaveBeenCalledTimes(2);
  });

  it('only the buyer can mark payment', async () => {
    await expect(markPaid({ id: 'seller' }, 'trd_1')).rejects.toMatchObject({ status: 403 });
    await expect(markPaid({ id: 'stranger' }, 'trd_1')).rejects.toMatchObject({ status: 403 });
  });

  it('refuses after the payment window closed', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ paymentDeadline: new Date(Date.now() - 1000) }));
    await expect(markPaid({ id: 'buyer' }, 'trd_1')).rejects.toMatchObject({ code: 'PAYMENT_WINDOW_CLOSED' });
  });

  it('refuses when the trade already moved on', async () => {
    prisma.trade.findUnique.mockResolvedValue(trade({ status: 'PAID' }));
    await expect(markPaid({ id: 'buyer' }, 'trd_1')).rejects.toMatchObject({ status: 409 });
  });

  it('reports a race with the expiry job', async () => {
    prisma.trade.updateMany.mockResolvedValue({ count: 0 });
    await expect(markPaid({ id: 'buyer' }, 'trd_1')).rejects.toMatchObject({
      status: 409,
      message: 'This trade just changed. Refresh and try again.',
    });
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('404s for an unknown trade', async () => {
    prisma.trade.findUnique.mockResolvedValue(null);
    await expect(markPaid({ id: 'buyer' }, 'nope')).rejects.toMatchObject({ status: 404 });
  });
});
