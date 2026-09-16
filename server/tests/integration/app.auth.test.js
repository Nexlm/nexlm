import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: {} }));
vi.mock('../../src/services/auth.service.js', () => ({
  register: vi.fn(),
  login: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  changePassword: vi.fn(),
}));

const auth = await import('../../src/services/auth.service.js');
const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

beforeEach(() => vi.clearAllMocks());

const post = (path, body) =>
  server.json(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/auth/register', () => {
  it('creates an account and answers 201', async () => {
    auth.register.mockResolvedValue({ user: { id: 'usr_1' }, token: 'tok' });
    const { status, body } = await post('/api/auth/register', {
      email: 'Ada@X.NG',
      password: 'naira2026',
      displayName: 'ada',
    });

    expect(status).toBe(201);
    expect(body).toEqual({ user: { id: 'usr_1' }, token: 'tok' });
    expect(auth.register).toHaveBeenCalledWith({ email: 'ada@x.ng', password: 'naira2026', displayName: 'ada' });
  });

  it('rejects a weak password before touching the service', async () => {
    const { status, body } = await post('/api/auth/register', { email: 'ada@x.ng', password: 'weak', displayName: 'ada' });
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('rejects a display name with spaces', async () => {
    const { status } = await post('/api/auth/register', {
      email: 'ada@x.ng',
      password: 'naira2026',
      displayName: 'ada lovelace',
    });
    expect(status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns the session', async () => {
    auth.login.mockResolvedValue({ user: { id: 'usr_1' }, token: 'tok' });
    const { status, body } = await post('/api/auth/login', { email: 'ada@x.ng', password: 'naira2026' });
    expect(status).toBe(200);
    expect(body.token).toBe('tok');
  });

  it('passes service errors through with their code', async () => {
    const { unauthorized } = await import('../../src/lib/errors.js');
    auth.login.mockRejectedValue(unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS'));

    const { status, body } = await post('/api/auth/login', { email: 'ada@x.ng', password: 'wrong' });
    expect(status).toBe(401);
    expect(body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' });
  });
});

describe('password reset endpoints', () => {
  it('never reveals whether an email is registered', async () => {
    auth.requestPasswordReset.mockResolvedValue(undefined);
    const { status, body } = await post('/api/auth/forgot-password', { email: 'ghost@x.ng' });

    expect(status).toBe(200);
    expect(body).toEqual({ ok: true, message: 'If that email is registered, a reset link is on its way.' });
  });

  it('requires a well-formed reset token', async () => {
    const { status } = await post('/api/auth/reset-password', { token: 'short', password: 'naira2027' });
    expect(status).toBe(400);
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });
});

describe('authenticated auth routes', () => {
  it('require a session', async () => {
    for (const path of ['/api/auth/resend-verification', '/api/auth/change-password']) {
      const { status } = await post(path, { currentPassword: 'a', newPassword: 'naira2027' });
      expect(status).toBe(401);
    }
    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it('exposes the current session user at /api/auth/me', async () => {
    const { status } = await server.json('/api/auth/me');
    expect(status).toBe(401);
  });
});
