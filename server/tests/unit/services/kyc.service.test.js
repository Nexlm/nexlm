import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: { user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() } },
}));
vi.mock('../../../src/services/smileId.js', () => ({
  isSmileConfigured: vi.fn(),
  verifyNigerianId: vi.fn(),
}));

const { prisma } = await import('../../../src/lib/prisma.js');
const { isSmileConfigured, verifyNigerianId } = await import('../../../src/services/smileId.js');
const { getKycStatus, submitKyc } = await import('../../../src/services/kyc.service.js');

const user = { id: 'usr_1', kycStatus: 'UNVERIFIED' };
const input = {
  idType: 'BVN',
  idNumber: '22212345678',
  firstName: 'Ada',
  lastName: 'Obi',
  dateOfBirth: '1994-05-17',
};

const dataWritten = () => prisma.user.update.mock.calls[0][0].data;

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findFirst.mockResolvedValue(null);
  prisma.user.update.mockResolvedValue({});
  isSmileConfigured.mockReturnValue(false);
});

describe('getKycStatus', () => {
  it('never exposes the ID fingerprint', async () => {
    prisma.user.findUnique.mockResolvedValue({ kycStatus: 'VERIFIED' });
    await getKycStatus('usr_1');
    const { select } = prisma.user.findUnique.mock.calls[0][0];
    expect(select.kycIdHash).toBeUndefined();
    expect(select.kycIdLast4).toBe(true);
  });
});

describe('submitKyc without a verification provider', () => {
  it('queues the submission for manual review', async () => {
    const result = await submitKyc(user, input);
    expect(result).toMatchObject({ status: 'PENDING' });
    expect(dataWritten().kycStatus).toBe('PENDING');
    expect(verifyNigerianId).not.toHaveBeenCalled();
  });

  it('stores only a fingerprint and the last four digits', async () => {
    await submitKyc(user, input);
    const data = dataWritten();
    expect(data.kycIdLast4).toBe('5678');
    expect(data.kycIdHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(data)).not.toContain('22212345678');
  });

  it('records the full name as submitted', async () => {
    await submitKyc(user, input);
    expect(dataWritten().kycFullName).toBe('Ada Obi');
  });
});

describe('submitKyc with Smile ID', () => {
  beforeEach(() => isSmileConfigured.mockReturnValue(true));

  it('verifies instantly when the ID matches', async () => {
    verifyNigerianId.mockResolvedValue({ verified: true, jobId: 'nexlm-abc' });
    const result = await submitKyc(user, input);
    expect(result.status).toBe('VERIFIED');
    expect(dataWritten()).toMatchObject({ kycStatus: 'VERIFIED', kycReference: 'nexlm-abc' });
  });

  it('rejects with advice when the details do not match', async () => {
    verifyNigerianId.mockResolvedValue({ verified: false, jobId: 'nexlm-def' });
    const result = await submitKyc(user, input);
    expect(result.status).toBe('REJECTED');
    expect(result.message).toContain('Check your name and date of birth');
  });

  it('does not record a decision when the provider is down', async () => {
    verifyNigerianId.mockRejectedValue(Object.assign(new Error('down'), { code: 'KYC_PROVIDER_ERROR' }));
    await expect(submitKyc(user, input)).rejects.toMatchObject({ code: 'KYC_PROVIDER_ERROR' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('submitKyc guards', () => {
  it('refuses when already verified or under review', async () => {
    await expect(submitKyc({ ...user, kycStatus: 'VERIFIED' }, input)).rejects.toMatchObject({
      message: 'Your identity is already verified',
    });
    await expect(submitKyc({ ...user, kycStatus: 'PENDING' }, input)).rejects.toMatchObject({
      message: 'Your verification is already under review',
    });
  });

  it('lets a rejected trader try again', async () => {
    await expect(submitKyc({ ...user, kycStatus: 'REJECTED' }, input)).resolves.toBeTruthy();
  });

  it('blocks one ID being used by two accounts', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'usr_2' });
    await expect(submitKyc(user, input)).rejects.toMatchObject({
      status: 409,
      message: 'This ID is already linked to another Nexlm account',
    });
  });

  it('checks for duplicates by fingerprint, not by raw ID', async () => {
    await submitKyc(user, input);
    const { where } = prisma.user.findFirst.mock.calls[0][0];
    expect(where.kycIdHash).toMatch(/^[a-f0-9]{64}$/);
    expect(where.id).toEqual({ not: 'usr_1' });
  });
});
