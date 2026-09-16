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
const { getXlmBalance } = await import('../../../src/stellar/wallet.js');
const { lockEscrow } = await import('../../../src/stellar/escrow.js');
const { openTrade } = await import('../../../src/services/trade.service.js');

const taker = { id: 'buyer' };
const order = (overrides = {}) => ({
  id: 'ord_1',
  userId: 'seller',
  type: 'SELL',
  status: 'ACTIVE',
  xlmAmount: '250',
  ngnRate: '1500',
  paymentMethods: ['OPAY'],
  expiresAt: new Date(Date.now() + 600_000),
  ...overrides,
});

const open = () => openTrade(taker, { orderId: 'ord_1', paymentMethod: 'OPAY' });

beforeEach(() => {
  vi.clearAllMocks();
  prisma.order.findUnique.mockResolvedValue(order());
  prisma.trade.count.mockResolvedValue(0);
  prisma.paymentAccount.findFirst.mockResolvedValue({ id: 'pa_1' });
  prisma.user.findUnique.mockResolvedValue({ id: 'seller', status: 'ACTIVE', stellarPublicKey: 'GSELLER', stellarSecretEnc: 'enc' });
  getXlmBalance.mockResolvedValue({ available: '1000' });
  prisma.order.updateMany.mockResolvedValue({ count: 1 });
  prisma.trade.create.mockImplementation(async ({ data }) => ({ id: 'trd_1', ...data }));
  lockEscrow.mockResolvedValue({ escrowPublicKey: 'GESCROW', txHash: 'lock-hash' });
  prisma.$transaction.mockImplementation(async (arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma)));
  prisma.trade.update.mockImplementation(async ({ data }) => ({ id: 'trd_1', buyerId: 'buyer', sellerId: 'seller', ...data }));
});

describe('openTrade guards', () => {
  it('refuses orders that are gone, closed or expired', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(open()).rejects.toMatchObject({ status: 404 });

    prisma.order.findUnique.mockResolvedValue(order({ status: 'FILLED' }));
    await expect(open()).rejects.toMatchObject({ status: 404 });

    prisma.order.findUnique.mockResolvedValue(order({ expiresAt: new Date(Date.now() - 1) }));
    await expect(open()).rejects.toMatchObject({ status: 404 });
  });

  it('refuses trading against your own order', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ userId: 'buyer' }));
    await expect(open()).rejects.toMatchObject({ message: 'You cannot trade against your own order' });
  });

  it('refuses a payment method the advertiser does not accept', async () => {
    await expect(openTrade(taker, { orderId: 'ord_1', paymentMethod: 'KUDA' })).rejects.toMatchObject({
      message: 'The advertiser does not accept this payment method',
    });
  });

  it('caps concurrent trades', async () => {
    prisma.trade.count.mockResolvedValue(5);
    await expect(open()).rejects.toMatchObject({ code: 'TOO_MANY_TRADES' });
  });

  it('requires the seller to have a payout account for the method', async () => {
    prisma.paymentAccount.findFirst.mockResolvedValue(null);
    await expect(open()).rejects.toMatchObject({
      code: 'PAYMENT_ACCOUNT_REQUIRED',
      message: 'The seller has no payout account for this payment method',
    });
  });

  it('refuses when the seller account is not active', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'seller', status: 'SUSPENDED', stellarPublicKey: 'GSELLER' });
    await expect(open()).rejects.toMatchObject({ code: 'COUNTERPARTY_INACTIVE' });
  });

  it('refuses when the seller can no longer cover amount plus overhead', async () => {
    getXlmBalance.mockResolvedValue({ available: '251' });
    await expect(open()).rejects.toMatchObject({
      code: 'INSUFFICIENT_BALANCE',
      message: 'The seller no longer has enough XLM to fund this order',
    });
  });

  it('loses the race when another taker claims the order first', async () => {
    prisma.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(open()).rejects.toMatchObject({ status: 409, message: 'Another trader just took this order' });
    expect(prisma.trade.create).not.toHaveBeenCalled();
  });
});

describe('openTrade success', () => {
  it('locks the order, stores the escrow address before submitting, and computes the Naira total', async () => {
    await open();

    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'ord_1', status: 'ACTIVE' },
      data: { status: 'FILLED' },
    });
    const { data } = prisma.trade.create.mock.calls[0][0];
    expect(data).toMatchObject({
      buyerId: 'buyer',
      sellerId: 'seller',
      xlmAmount: '250',
      ngnAmount: '375000.00',
      escrowPublicKey: 'GESCROW',
    });
    expect(prisma.trade.create.mock.invocationCallOrder[0]).toBeLessThan(lockEscrow.mock.invocationCallOrder[0]);
  });

  it('makes the taker the seller on a buy order', async () => {
    prisma.order.findUnique.mockResolvedValue(order({ type: 'BUY', userId: 'maker' }));
    await open();
    expect(prisma.trade.create.mock.calls[0][0].data).toMatchObject({ buyerId: 'maker', sellerId: 'buyer' });
  });

  it('starts the payment window when the funds are locked', async () => {
    await open();
    const lockData = prisma.trade.update.mock.calls[0][0].data;
    expect(lockData).toMatchObject({ status: 'ESCROW_LOCKED', escrowTxHash: 'lock-hash' });
    expect(lockData.paymentDeadline.getTime()).toBeGreaterThan(Date.now());
  });

  it('records the escrow lock as a transaction and explains it in chat', async () => {
    await open();
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'ESCROW_LOCK', xlmAmount: '250', stellarTxHash: 'lock-hash' }),
    });
    expect(prisma.message.create.mock.calls[0][0].data.content).toContain('locked in escrow');
  });
});
