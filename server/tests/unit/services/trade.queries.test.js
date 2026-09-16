import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => {
  const prisma = {
    trade: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    order: { updateMany: vi.fn(async () => ({ count: 0 })) },
    paymentAccount: { findFirst: vi.fn() },
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
  refundEscrow: vi.fn(async () => ({ txHash: 'refund-hash' })),
  findEscrowTransactions: vi.fn(),
  ESCROW_MEMOS: { lock: 'lock', release: 'release', refund: 'refund' },
}));
vi.mock('../../../src/stellar/wallet.js', () => ({ getXlmBalance: vi.fn() }));
vi.mock('../../../src/lib/secrets.js', () => ({ decryptSecret: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { refundEscrow } = await import('../../../src/stellar/escrow.js');
const { getTradeDetails, listMyTrades } = await import('../../../src/services/trade.service.js');

const open = (overrides = {}) => ({
  id: 'trd_1',
  orderId: 'ord_1',
  buyerId: 'buyer',
  sellerId: 'seller',
  status: 'ESCROW_LOCKED',
  xlmAmount: '250',
  paymentMethod: 'OPAY',
  escrowTxHash: 'lock-hash',
  releaseTxHash: null,
  refundTxHash: null,
  paymentDeadline: new Date(Date.now() + 300_000),
  buyer: { stellarPublicKey: 'GBUYER' },
  seller: { stellarPublicKey: 'GSELLER' },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.trade.findUnique.mockResolvedValue(open());
  prisma.paymentAccount.findFirst.mockResolvedValue({ method: 'OPAY', accountName: 'Ada Obi', accountNumber: '8031234567' });
  prisma.trade.updateMany.mockResolvedValue({ count: 1 });
  prisma.trade.update.mockImplementation(async ({ data }) => ({ ...open(), ...data }));
  prisma.trade.findMany.mockResolvedValue([]);
  prisma.trade.count.mockResolvedValue(0);
});

describe('getTradeDetails', () => {
  it('tells each party their role and what they can do', async () => {
    const forBuyer = await getTradeDetails({ id: 'buyer' }, 'trd_1');
    expect(forBuyer.role).toBe('BUYER');
    expect(forBuyer.actions).toEqual(['MARK_PAID', 'CANCEL']);

    const forSeller = await getTradeDetails({ id: 'seller' }, 'trd_1');
    expect(forSeller.role).toBe('SELLER');
    expect(forSeller.actions).toEqual(['RELEASE']);
  });

  it('includes the seller payout account to pay into', async () => {
    const details = await getTradeDetails({ id: 'buyer' }, 'trd_1');
    expect(details.paymentAccount).toMatchObject({ accountNumber: '8031234567' });
    expect(prisma.paymentAccount.findFirst.mock.calls[0][0].where).toEqual({ userId: 'seller', method: 'OPAY' });
  });

  it('counts down only while payment is due', async () => {
    expect((await getTradeDetails({ id: 'buyer' }, 'trd_1')).secondsRemaining).toBeGreaterThan(0);

    prisma.trade.findUnique.mockResolvedValue(open({ status: 'COMPLETED' }));
    expect((await getTradeDetails({ id: 'buyer' }, 'trd_1')).secondsRemaining).toBe(0);
  });

  it('links every on-chain step that exists', async () => {
    prisma.trade.findUnique.mockResolvedValue(open({ status: 'COMPLETED', releaseTxHash: 'release-hash' }));
    const { links } = await getTradeDetails({ id: 'buyer' }, 'trd_1');
    expect(links.escrow).toContain('/tx/lock-hash');
    expect(links.release).toContain('/tx/release-hash');
    expect(links.refund).toBeNull();
  });

  it('settles an overdue trade as soon as anyone opens it', async () => {
    const overdue = open({ paymentDeadline: new Date(Date.now() - 1000) });
    prisma.trade.findUnique.mockResolvedValueOnce(overdue).mockResolvedValueOnce(overdue);
    await getTradeDetails({ id: 'buyer' }, 'trd_1');
    expect(refundEscrow).toHaveBeenCalled();
  });

  it('refuses people who are not part of the trade', async () => {
    await expect(getTradeDetails({ id: 'stranger' }, 'trd_1')).rejects.toMatchObject({ status: 403 });
  });

  it('lets admins view any trade', async () => {
    const details = await getTradeDetails({ id: 'admin_1', role: 'ADMIN' }, 'trd_1');
    expect(details.role).toBeNull();
    expect(details.actions).toEqual([]);
  });
});

describe('listMyTrades', () => {
  it('returns trades on either side of the deal, newest first', async () => {
    await listMyTrades('usr_1', { scope: 'all', page: 1, pageSize: 20 });
    const args = prisma.trade.findMany.mock.calls[0][0];
    expect(args.where.OR).toEqual([{ buyerId: 'usr_1' }, { sellerId: 'usr_1' }]);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('filters by scope', async () => {
    await listMyTrades('usr_1', { scope: 'active', page: 1, pageSize: 20 });
    expect(prisma.trade.findMany.mock.calls[0][0].where.status).toEqual({
      in: ['PENDING_ESCROW', 'ESCROW_LOCKED', 'PAID', 'RELEASING', 'REFUNDING'],
    });

    await listMyTrades('usr_1', { scope: 'completed', page: 1, pageSize: 20 });
    expect(prisma.trade.findMany.mock.calls[1][0].where.status).toBe('COMPLETED');
  });

  it('labels each row with the user’s role', async () => {
    prisma.trade.findMany.mockResolvedValue([open(), open({ id: 'trd_2', buyerId: 'other', sellerId: 'usr_1' })]);
    prisma.trade.count.mockResolvedValue(2);
    const { items } = await listMyTrades('usr_1', { scope: 'all', page: 1, pageSize: 20 });
    expect(items.map((t) => t.role)).toEqual([null, 'SELLER']);
  });
});
