import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: { user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } },
}));
vi.mock('../../../src/services/email.service.js', () => ({
  sendVerificationEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
}));
vi.mock('../../../src/stellar/wallet.js', () => ({ generateKeypair: vi.fn(), fundTestnetAccount: vi.fn() }));
vi.mock('../../../src/lib/secrets.js', () => ({ encryptSecret: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { verifyAccessToken } = await import('../../../src/middleware/auth.js');
const { changePassword, login } = await import('../../../src/services/auth.service.js');

const passwordHash = bcrypt.hashSync('naira2026', 10);
const record = (overrides = {}) => ({
  id: 'usr_1',
  email: 'ada@x.ng',
  role: 'USER',
  status: 'ACTIVE',
  passwordHash,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(record());
  prisma.user.update.mockResolvedValue({});
});

describe('login', () => {
  it('returns the user and a token', async () => {
    const { user, token } = await login({ email: 'ada@x.ng', password: 'naira2026' });
    expect(user).toMatchObject({ id: 'usr_1', email: 'ada@x.ng' });
    expect(verifyAccessToken(token).sub).toBe('usr_1');
  });

  it('never returns the password hash', async () => {
    const { user } = await login({ email: 'ada@x.ng', password: 'naira2026' });
    expect(user.passwordHash).toBeUndefined();
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await login({ email: 'ada@x.ng', password: 'nope' }).catch((e) => e);
    prisma.user.findUnique.mockResolvedValue(null);
    const unknownEmail = await login({ email: 'ghost@x.ng', password: 'whatever' }).catch((e) => e);

    expect(wrongPassword).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(unknownEmail.message).toBe(wrongPassword.message);
    expect(unknownEmail.code).toBe(wrongPassword.code);
  });

  it('still compares a hash for unknown emails, so timing does not reveal accounts', async () => {
    const compare = vi.spyOn(bcrypt, 'compare');
    prisma.user.findUnique.mockResolvedValue(null);
    await login({ email: 'ghost@x.ng', password: 'whatever' }).catch(() => {});
    expect(compare).toHaveBeenCalled();
    compare.mockRestore();
  });

  it('blocks restricted accounts with a clear reason', async () => {
    prisma.user.findUnique.mockResolvedValue(record({ status: 'SUSPENDED' }));
    await expect(login({ email: 'ada@x.ng', password: 'naira2026' })).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_RESTRICTED',
      message: 'Your account is suspended. Contact support.',
    });
  });
});

describe('changePassword', () => {
  it('requires the current password', async () => {
    prisma.user.findUnique.mockResolvedValue({ passwordHash });
    await expect(changePassword('usr_1', { currentPassword: 'wrong', newPassword: 'naira2027' })).rejects.toMatchObject({
      message: 'Your current password is incorrect',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('stores a new hash', async () => {
    prisma.user.findUnique.mockResolvedValue({ passwordHash });
    await changePassword('usr_1', { currentPassword: 'naira2026', newPassword: 'naira2027' });

    const newHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(newHash).not.toBe(passwordHash);
    expect(bcrypt.compareSync('naira2027', newHash)).toBe(true);
  });
});
