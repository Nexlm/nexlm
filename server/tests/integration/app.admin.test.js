import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('../../src/services/admin.service.js', () => ({
  getOverview: vi.fn(),
  listUsers: vi.fn(),
  getUser: vi.fn(),
  setUserStatus: vi.fn(),
  reviewKyc: vi.fn(),
  listTrades: vi.fn(),
}));
// The trade routes are mounted too, so every export they use must exist.
vi.mock('../../src/services/trade.service.js', () => ({
  getTradeDetails: vi.fn(),
  listMyTrades: vi.fn(),
  openTrade: vi.fn(),
  markPaid: vi.fn(),
  releaseTrade: vi.fn(),
  cancelTrade: vi.fn(),
}));
vi.mock('../../src/services/chat.service.js', () => ({ listMessages: vi.fn(), sendMessage: vi.fn() }));

const { prisma } = await import('../../src/lib/prisma.js');
const admin = await import('../../src/services/admin.service.js');
const trades = await import('../../src/services/trade.service.js');
const chat = await import('../../src/services/chat.service.js');
const { signAccessToken } = await import('../../src/middleware/auth.js');
const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

const adminUser = { id: 'adm_1', role: 'ADMIN', status: 'ACTIVE', emailVerified: true };
const asAdmin = { Authorization: `Bearer ${signAccessToken(adminUser)}` };
const asTrader = { Authorization: `Bearer ${signAccessToken({ id: 'usr_1', role: 'USER' })}` };

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(adminUser);
});

describe('admin routes are locked down', () => {
  it('reject anonymous requests', async () => {
    expect((await server.json('/api/admin/overview')).status).toBe(401);
  });

  it('reject ordinary traders', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'usr_1', role: 'USER', status: 'ACTIVE' });
    const { status, body } = await server.json('/api/admin/overview', { headers: asTrader });

    expect(status).toBe(403);
    expect(body.error.message).toBe('Admin access required');
    expect(admin.getOverview).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/overview', () => {
  it('returns the dashboard figures', async () => {
    admin.getOverview.mockResolvedValue({ users: { total: 3 } });
    const { status, body } = await server.json('/api/admin/overview', { headers: asAdmin });

    expect(status).toBe(200);
    expect(body).toEqual({ users: { total: 3 } });
  });
});

describe('GET /api/admin/users', () => {
  it('passes search and filters through', async () => {
    admin.listUsers.mockResolvedValue({ items: [], pagination: {} });
    await server.json('/api/admin/users?q=ada&kycStatus=PENDING&page=2', { headers: asAdmin });

    expect(admin.listUsers).toHaveBeenCalledWith({ q: 'ada', kycStatus: 'PENDING', page: 2, pageSize: 20 });
  });

  it('rejects an unknown KYC filter', async () => {
    const { status } = await server.json('/api/admin/users?kycStatus=MAYBE', { headers: asAdmin });
    expect(status).toBe(400);
  });
});

describe('PATCH /api/admin/users/:id/status', () => {
  const patch = (body) =>
    server.json('/api/admin/users/usr_9/status', {
      method: 'PATCH',
      headers: { ...asAdmin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('suspends an account', async () => {
    admin.setUserStatus.mockResolvedValue({ id: 'usr_9', status: 'SUSPENDED' });
    const { status, body } = await patch({ status: 'SUSPENDED' });

    expect(status).toBe(200);
    expect(body.status).toBe('SUSPENDED');
    expect(admin.setUserStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'adm_1' }), 'usr_9', 'SUSPENDED');
  });

  it('rejects an unknown status', async () => {
    const { status } = await patch({ status: 'DELETED' });
    expect(status).toBe(400);
    expect(admin.setUserStatus).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/kyc/:id', () => {
  it('records the decision', async () => {
    admin.reviewKyc.mockResolvedValue({ kycStatus: 'VERIFIED' });
    const { status } = await server.json('/api/admin/kyc/usr_9', {
      method: 'POST',
      headers: { ...asAdmin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'APPROVE' }),
    });

    expect(status).toBe(200);
    expect(admin.reviewKyc).toHaveBeenCalledWith('usr_9', 'APPROVE');
  });
});

describe('GET /api/admin/trades/:id', () => {
  it('returns the trade with its chat for review', async () => {
    trades.getTradeDetails.mockResolvedValue({ id: 'trd_1', status: 'PAID' });
    chat.listMessages.mockResolvedValue([{ id: 'm1' }]);

    const { status, body } = await server.json('/api/admin/trades/trd_1', { headers: asAdmin });
    expect(status).toBe(200);
    expect(body).toEqual({ id: 'trd_1', status: 'PAID', messages: [{ id: 'm1' }] });
  });
});
