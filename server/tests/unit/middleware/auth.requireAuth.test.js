import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({ prisma: { user: { findUnique: vi.fn() } } }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { requireAdmin, requireAuth, signAccessToken } = await import('../../../src/middleware/auth.js');

const activeUser = { id: 'usr_1', role: 'USER', status: 'ACTIVE' };
const reqWith = (token) => ({ headers: token ? { authorization: `Bearer ${token}` } : {} });

const run = async (req) => {
  const next = vi.fn();
  await requireAuth(req, {}, next);
  return next.mock.calls[0][0];
};

beforeEach(() => vi.clearAllMocks());

describe('requireAuth', () => {
  it('attaches the user for a valid token', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);
    const req = reqWith(signAccessToken(activeUser));
    expect(await run(req)).toBeUndefined();
    expect(req.user).toEqual(activeUser);
  });

  it('requires an Authorization header', async () => {
    expect(await run(reqWith(null))).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });

  it('ignores headers that are not bearer tokens', async () => {
    expect(await run({ headers: { authorization: 'Basic abc' } })).toMatchObject({ status: 401 });
  });

  it('asks the user to log in again when the token is invalid', async () => {
    expect(await run(reqWith('garbage'))).toMatchObject({ status: 401, code: 'SESSION_EXPIRED' });
  });

  it('rejects tokens for deleted accounts', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await run(reqWith(signAccessToken(activeUser)))).toMatchObject({ status: 401 });
  });

  it('blocks suspended accounts with a clear reason', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, status: 'SUSPENDED' });
    expect(await run(reqWith(signAccessToken(activeUser)))).toMatchObject({
      status: 403,
      code: 'ACCOUNT_RESTRICTED',
      message: 'Your account is suspended. Contact support.',
    });
  });

  it('forwards database failures', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('database down'));
    expect(await run(reqWith(signAccessToken(activeUser)))).toMatchObject({ message: 'database down' });
  });
});

describe('requireAdmin', () => {
  it('allows admins through', () => {
    const next = vi.fn();
    requireAdmin({ user: { role: 'ADMIN' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks everyone else', () => {
    const next = vi.fn();
    requireAdmin({ user: { role: 'USER' } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });
});
