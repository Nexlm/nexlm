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
const { sendPasswordResetEmail, sendVerificationEmail } = await import('../../../src/services/email.service.js');
const { sha256 } = await import('../../../src/lib/crypto.js');
const { requestPasswordReset, resendVerification, resetPassword, verifyEmail } = await import(
  '../../../src/services/auth.service.js'
);

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.update.mockResolvedValue({});
});

describe('verifyEmail', () => {
  it('looks the token up by hash and burns it', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'usr_1' });
    await verifyEmail('plain-token');

    expect(prisma.user.findUnique.mock.calls[0][0].where.emailVerifyTokenHash).toBe(sha256('plain-token'));
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ emailVerified: true, emailVerifyTokenHash: null });
  });

  it('rejects a used or invalid link', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(verifyEmail('nope')).rejects.toMatchObject({
      status: 400,
      message: 'This verification link is invalid or has already been used',
    });
  });
});

describe('resendVerification', () => {
  it('issues a fresh token', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: 'ada@x.ng', emailVerified: false });
    await resendVerification('usr_1');

    const [, token] = sendVerificationEmail.mock.calls[0];
    expect(prisma.user.update.mock.calls[0][0].data.emailVerifyTokenHash).toBe(sha256(token));
  });

  it('refuses once the email is verified', async () => {
    prisma.user.findUnique.mockResolvedValue({ emailVerified: true });
    await expect(resendVerification('usr_1')).rejects.toMatchObject({ status: 409 });
  });
});

describe('requestPasswordReset', () => {
  it('emails a token that expires in an hour', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'usr_1' });
    await requestPasswordReset('ada@x.ng');

    const { data } = prisma.user.update.mock.calls[0][0];
    const [, token] = sendPasswordResetEmail.mock.calls[0];
    expect(data.passwordResetTokenHash).toBe(sha256(token));
    expect(data.passwordResetExpiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 60_000);
  });

  it('says nothing about unknown emails', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(requestPasswordReset('ghost@x.ng')).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  it('sets a new password and clears the token', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'usr_1', passwordResetExpiresAt: new Date(Date.now() + 600_000) });
    await resetPassword({ token: 'tok', password: 'naira2027' });

    const { data } = prisma.user.update.mock.calls[0][0];
    expect(bcrypt.compareSync('naira2027', data.passwordHash)).toBe(true);
    expect(data.passwordResetTokenHash).toBeNull();
    expect(data.passwordResetExpiresAt).toBeNull();
  });

  it('refuses an expired token', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'usr_1', passwordResetExpiresAt: new Date(Date.now() - 1000) });
    await expect(resetPassword({ token: 'tok', password: 'naira2027' })).rejects.toMatchObject({
      message: 'This reset link is invalid or has expired',
    });
  });

  it('refuses an unknown token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(resetPassword({ token: 'nope', password: 'naira2027' })).rejects.toMatchObject({ status: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
