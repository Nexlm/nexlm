import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: { user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() } },
}));
vi.mock('../../../src/services/email.service.js', () => ({
  sendVerificationEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
}));
vi.mock('../../../src/stellar/wallet.js', () => ({
  generateKeypair: vi.fn(() => ({ publicKey: 'GNEW', secret: 'SNEW' })),
  fundTestnetAccount: vi.fn(async () => true),
}));
vi.mock('../../../src/lib/secrets.js', () => ({ encryptSecret: vi.fn(() => 'encrypted') }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { sendVerificationEmail } = await import('../../../src/services/email.service.js');
const { fundTestnetAccount, generateKeypair } = await import('../../../src/stellar/wallet.js');
const { encryptSecret } = await import('../../../src/lib/secrets.js');
const { verifyAccessToken } = await import('../../../src/middleware/auth.js');
const { register } = await import('../../../src/services/auth.service.js');

const input = { email: 'ada@x.ng', password: 'naira2026', displayName: 'ada' };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findFirst.mockResolvedValue(null);
  prisma.user.create.mockImplementation(async ({ data }) => ({ id: 'usr_1', role: 'USER', email: data.email }));
});

describe('register', () => {
  it('creates the account and returns a session token', async () => {
    const { user, token } = await register(input);
    expect(user).toMatchObject({ id: 'usr_1', email: 'ada@x.ng' });
    expect(verifyAccessToken(token)).toMatchObject({ sub: 'usr_1', role: 'USER' });
  });

  it('generates a Stellar wallet and stores the seed encrypted', async () => {
    await register(input);
    expect(generateKeypair).toHaveBeenCalled();
    expect(encryptSecret).toHaveBeenCalledWith('SNEW');

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data).toMatchObject({ stellarPublicKey: 'GNEW', stellarSecretEnc: 'encrypted' });
    expect(data.stellarSecret).toBeUndefined();
  });

  it('stores only a hash of the verification token', async () => {
    await register(input);
    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.emailVerifyTokenHash).toMatch(/^[a-f0-9]{64}$/);

    const [, sentToken] = sendVerificationEmail.mock.calls[0];
    expect(data.emailVerifyTokenHash).not.toBe(sentToken);
  });

  it('hashes the password rather than storing it', async () => {
    await register(input);
    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.passwordHash.startsWith('$2')).toBe(true);
    expect(data.passwordHash).not.toContain('naira2026');
  });

  it('funds the wallet on testnet', async () => {
    await register(input);
    expect(fundTestnetAccount).toHaveBeenCalledWith('GNEW');
  });

  it('never selects the password hash into the session user', async () => {
    await register(input);
    const { select } = prisma.user.create.mock.calls[0][0];
    expect(select.passwordHash).toBeUndefined();
    expect(select.stellarSecretEnc).toBeUndefined();
  });

  it('explains which detail is taken', async () => {
    prisma.user.findFirst.mockResolvedValue({ email: 'ada@x.ng' });
    await expect(register(input)).rejects.toMatchObject({
      status: 409,
      message: 'An account with this email already exists',
    });

    prisma.user.findFirst.mockResolvedValue({ email: 'someone@else.ng' });
    await expect(register(input)).rejects.toMatchObject({ message: 'That display name is taken' });
  });

  it('still registers when funding or email fails', async () => {
    fundTestnetAccount.mockRejectedValue(new Error('friendbot down'));
    sendVerificationEmail.mockRejectedValue(new Error('smtp down'));
    await expect(register(input)).resolves.toMatchObject({ user: { id: 'usr_1' } });
  });
});
