import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('../../src/services/trade.service.js', () => ({
  listMyTrades: vi.fn(),
  openTrade: vi.fn(),
  getTradeDetails: vi.fn(),
  markPaid: vi.fn(),
  releaseTrade: vi.fn(),
  cancelTrade: vi.fn(),
}));
vi.mock('../../src/services/chat.service.js', () => ({ listMessages: vi.fn(), sendMessage: vi.fn() }));

const { prisma } = await import('../../src/lib/prisma.js');
const trades = await import('../../src/services/trade.service.js');
const chat = await import('../../src/services/chat.service.js');
const { signAccessToken } = await import('../../src/middleware/auth.js');
const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

const sessionUser = { id: 'usr_1', role: 'USER', status: 'ACTIVE', emailVerified: true, kycStatus: 'VERIFIED' };
const authed = { Authorization: `Bearer ${signAccessToken(sessionUser)}` };

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(sessionUser);
  trades.getTradeDetails.mockResolvedValue({ id: 'trd_1', status: 'ESCROW_LOCKED' });
});

const post = (path, body, headers = authed) =>
  server.json(path, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('trade routes require a session', () => {
  it('rejects anonymous requests', async () => {
    expect((await server.json('/api/trades')).status).toBe(401);
    expect((await post('/api/trades', { orderId: 'o1', paymentMethod: 'OPAY' }, {})).status).toBe(401);
  });
});

describe('GET /api/trades', () => {
  it('defaults to every scope', async () => {
    trades.listMyTrades.mockResolvedValue({ items: [], pagination: {} });
    const { status } = await server.json('/api/trades', { headers: authed });

    expect(status).toBe(200);
    expect(trades.listMyTrades).toHaveBeenCalledWith('usr_1', { scope: 'all', page: 1, pageSize: 20 });
  });

  it('rejects an unknown scope', async () => {
    const { status } = await server.json('/api/trades?scope=disputed', { headers: authed });
    expect(status).toBe(400);
  });
});

describe('POST /api/trades', () => {
  it('opens a trade and returns the room', async () => {
    trades.openTrade.mockResolvedValue({ id: 'trd_1' });
    const { status, body } = await post('/api/trades', { orderId: 'ord_1', paymentMethod: 'OPAY' });

    expect(status).toBe(201);
    expect(body).toMatchObject({ id: 'trd_1' });
    expect(trades.openTrade).toHaveBeenCalledWith(expect.objectContaining({ id: 'usr_1' }), {
      orderId: 'ord_1',
      paymentMethod: 'OPAY',
    });
  });

  it('requires identity verification before trading', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...sessionUser, kycStatus: 'PENDING' });
    const { status, body } = await post('/api/trades', { orderId: 'ord_1', paymentMethod: 'OPAY' });

    expect(status).toBe(403);
    expect(body.error.code).toBe('KYC_REQUIRED');
    expect(trades.openTrade).not.toHaveBeenCalled();
  });

  it('rejects an unsupported payment method', async () => {
    const { status } = await post('/api/trades', { orderId: 'ord_1', paymentMethod: 'CASH' });
    expect(status).toBe(400);
  });
});

describe('trade actions', () => {
  it('marks payment, releases and cancels through the service', async () => {
    await post('/api/trades/trd_1/paid');
    await post('/api/trades/trd_1/release');
    await post('/api/trades/trd_1/cancel');

    expect(trades.markPaid).toHaveBeenCalledWith(expect.objectContaining({ id: 'usr_1' }), 'trd_1');
    expect(trades.releaseTrade).toHaveBeenCalledWith(expect.anything(), 'trd_1');
    expect(trades.cancelTrade).toHaveBeenCalledWith(expect.anything(), 'trd_1');
  });

  it('returns the refreshed trade after an action', async () => {
    trades.getTradeDetails.mockResolvedValue({ id: 'trd_1', status: 'PAID' });
    const { status, body } = await post('/api/trades/trd_1/paid');

    expect(status).toBe(200);
    expect(body.status).toBe('PAID');
  });

  it('passes conflicts through with their status', async () => {
    const { conflict } = await import('../../src/lib/errors.js');
    trades.releaseTrade.mockRejectedValue(conflict('This trade just changed. Refresh and try again.'));

    const { status, body } = await post('/api/trades/trd_1/release');
    expect(status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });
});

describe('trade chat routes', () => {
  it('lists messages for a participant', async () => {
    chat.listMessages.mockResolvedValue([{ id: 'm1' }]);
    const { status, body } = await server.json('/api/trades/trd_1/messages', { headers: authed });

    expect(status).toBe(200);
    expect(body).toEqual({ items: [{ id: 'm1' }] });
  });

  it('posts a message and answers 201', async () => {
    chat.sendMessage.mockResolvedValue({ id: 'm2', content: 'Sent via OPay' });
    const { status, body } = await post('/api/trades/trd_1/messages', { content: 'Sent via OPay' });

    expect(status).toBe(201);
    expect(body.id).toBe('m2');
    expect(chat.sendMessage).toHaveBeenCalledWith(expect.anything(), 'trd_1', {
      content: 'Sent via OPay',
      file: undefined,
    });
  });

  it('refuses outsiders with the service error', async () => {
    const { forbidden } = await import('../../src/lib/errors.js');
    chat.listMessages.mockRejectedValue(forbidden('You are not a party to this trade'));

    const { status, body } = await server.json('/api/trades/trd_1/messages', { headers: authed });
    expect(status).toBe(403);
    expect(body.error.message).toBe('You are not a party to this trade');
  });
});
