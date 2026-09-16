import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('../../src/services/wallet.service.js', () => ({
  getWalletSummary: vi.fn(),
  getDepositInfo: vi.fn(),
  getActivity: vi.fn(),
  listTransactions: vi.fn(),
  withdraw: vi.fn(),
  committedToSellOrders: vi.fn(),
}));

const { prisma } = await import('../../src/lib/prisma.js');
const wallet = await import('../../src/services/wallet.service.js');
const { signAccessToken } = await import('../../src/middleware/auth.js');
const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

const sessionUser = { id: 'usr_1', role: 'USER', status: 'ACTIVE', emailVerified: true, stellarPublicKey: 'GME' };
const token = signAccessToken(sessionUser);
const authed = { Authorization: `Bearer ${token}` };

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(sessionUser);
});

describe('wallet routes require a session', () => {
  it('rejects anonymous requests', async () => {
    for (const path of ['/api/wallet', '/api/wallet/deposit', '/api/wallet/activity', '/api/wallet/transactions']) {
      const { status } = await server.json(path);
      expect(status).toBe(401);
    }
  });
});

describe('GET /api/wallet', () => {
  it('returns the balance summary for the session user', async () => {
    wallet.getWalletSummary.mockResolvedValue({ balance: '100', withdrawable: '98' });
    const { status, body } = await server.json('/api/wallet', { headers: authed });

    expect(status).toBe(200);
    expect(body).toEqual({ balance: '100', withdrawable: '98' });
    expect(wallet.getWalletSummary).toHaveBeenCalledWith(expect.objectContaining({ id: 'usr_1' }));
  });
});

describe('GET /api/wallet/activity', () => {
  it('passes a cursor through', async () => {
    wallet.getActivity.mockResolvedValue({ items: [], nextCursor: null });
    await server.json('/api/wallet/activity?cursor=p1', { headers: authed });
    expect(wallet.getActivity).toHaveBeenCalledWith(expect.anything(), { cursor: 'p1' });
  });

  it('rejects an oversized cursor', async () => {
    const { status } = await server.json(`/api/wallet/activity?cursor=${'9'.repeat(65)}`, { headers: authed });
    expect(status).toBe(400);
  });
});

describe('POST /api/wallet/withdraw', () => {
  const withdraw = (body, headers = authed) =>
    server.json('/api/wallet/withdraw', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const destination = 'GBVLGXNOVFYV7RI7FTATOXPEPBU5D5CGXVOM4RBHYPBNBGULQJJVUP26';

  it('sends the withdrawal and answers 201', async () => {
    wallet.withdraw.mockResolvedValue({ txHash: 'abc', explorerUrl: 'https://stellar.expert/tx/abc' });
    const { status, body } = await withdraw({ destination, amount: '50' });

    expect(status).toBe(201);
    expect(body.txHash).toBe('abc');
    expect(wallet.withdraw).toHaveBeenCalledWith('usr_1', { destination, amount: '50', memo: undefined });
  });

  it('rejects an invalid destination', async () => {
    const { status, body } = await withdraw({ destination: 'GABC', amount: '50' });
    expect(status).toBe(400);
    expect(body.error.message).toBe('Enter a valid Stellar address (starts with G)');
    expect(wallet.withdraw).not.toHaveBeenCalled();
  });

  it('requires a verified email', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...sessionUser, emailVerified: false });
    const { status, body } = await withdraw({ destination, amount: '50' });

    expect(status).toBe(403);
    expect(body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(wallet.withdraw).not.toHaveBeenCalled();
  });

  it('blocks suspended accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...sessionUser, status: 'SUSPENDED' });
    const { status, body } = await withdraw({ destination, amount: '50' });

    expect(status).toBe(403);
    expect(body.error.code).toBe('ACCOUNT_RESTRICTED');
  });
});
