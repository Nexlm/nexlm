import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('../../src/services/user.service.js', () => ({
  getMe: vi.fn(),
  updateProfile: vi.fn(),
  getPublicProfile: vi.fn(),
  listPaymentAccounts: vi.fn(),
  addPaymentAccount: vi.fn(),
  deletePaymentAccount: vi.fn(),
}));

const { prisma } = await import('../../src/lib/prisma.js');
const users = await import('../../src/services/user.service.js');
const { signAccessToken } = await import('../../src/middleware/auth.js');
const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

const sessionUser = { id: 'usr_1', role: 'USER', status: 'ACTIVE', emailVerified: true };
const authed = { Authorization: `Bearer ${signAccessToken(sessionUser)}` };

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(sessionUser);
});

const send = (path, method, body, headers = authed) =>
  server.json(path, {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('GET /api/users/me', () => {
  it('returns the session profile', async () => {
    users.getMe.mockResolvedValue({ id: 'usr_1', email: 'ada@x.ng' });
    const { status, body } = await server.json('/api/users/me', { headers: authed });

    expect(status).toBe(200);
    expect(body).toEqual({ user: { id: 'usr_1', email: 'ada@x.ng' } });
  });

  it('requires a session', async () => {
    expect((await server.json('/api/users/me')).status).toBe(401);
  });
});

describe('PATCH /api/users/me', () => {
  it('normalises a Nigerian phone number before saving', async () => {
    users.updateProfile.mockResolvedValue({ id: 'usr_1', phone: '+2348031234567' });
    const { status } = await send('/api/users/me', 'PATCH', { phone: '0803 123 4567' });

    expect(status).toBe(200);
    expect(users.updateProfile).toHaveBeenCalledWith('usr_1', { phone: '+2348031234567' });
  });

  it('rejects a number that is not Nigerian', async () => {
    const { status, body } = await send('/api/users/me', 'PATCH', { phone: '+14155550100' });
    expect(status).toBe(400);
    expect(body.error.message).toBe('Enter a valid Nigerian phone number');
  });
});

describe('payment account routes', () => {
  it('lists saved accounts', async () => {
    users.listPaymentAccounts.mockResolvedValue([{ id: 'pa_1' }]);
    const { status, body } = await server.json('/api/users/me/payment-accounts', { headers: authed });

    expect(status).toBe(200);
    expect(body).toEqual({ items: [{ id: 'pa_1' }] });
  });

  it('adds an account and answers 201', async () => {
    users.addPaymentAccount.mockResolvedValue({ id: 'pa_2' });
    const { status } = await send('/api/users/me/payment-accounts', 'POST', {
      method: 'OPAY',
      accountName: 'Ada Obi',
      accountNumber: '8031234567',
    });
    expect(status).toBe(201);
  });

  it('requires a bank name for bank transfers', async () => {
    const { status, body } = await send('/api/users/me/payment-accounts', 'POST', {
      method: 'BANK_TRANSFER',
      accountName: 'Ada Obi',
      accountNumber: '8031234567',
    });

    expect(status).toBe(400);
    expect(body.error.details[0].path).toBe('bankName');
    expect(users.addPaymentAccount).not.toHaveBeenCalled();
  });

  it('deletes an account with no content', async () => {
    users.deletePaymentAccount.mockResolvedValue(undefined);
    const response = await server.call('/api/users/me/payment-accounts/pa_1', { method: 'DELETE', headers: authed });

    expect(response.status).toBe(204);
    expect(users.deletePaymentAccount).toHaveBeenCalledWith('usr_1', 'pa_1');
  });
});

describe('GET /api/users/:displayName', () => {
  it('is public so traders can be checked before a deal', async () => {
    users.getPublicProfile.mockResolvedValue({ displayName: 'ada' });
    const { status, body } = await server.json('/api/users/ada');

    expect(status).toBe(200);
    expect(body).toEqual({ displayName: 'ada' });
  });

  it('404s for an unknown trader', async () => {
    const { notFound } = await import('../../src/lib/errors.js');
    users.getPublicProfile.mockRejectedValue(notFound('Trader not found'));

    const { status, body } = await server.json('/api/users/ghost');
    expect(status).toBe(404);
    expect(body.error.message).toBe('Trader not found');
  });
});
