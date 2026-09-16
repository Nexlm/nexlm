import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock('../../src/services/kyc.service.js', () => ({ getKycStatus: vi.fn(), submitKyc: vi.fn() }));

const { prisma } = await import('../../src/lib/prisma.js');
const kyc = await import('../../src/services/kyc.service.js');
const { signAccessToken } = await import('../../src/middleware/auth.js');
const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

const sessionUser = { id: 'usr_1', role: 'USER', status: 'ACTIVE', emailVerified: true, kycStatus: 'UNVERIFIED' };
const authed = { Authorization: `Bearer ${signAccessToken(sessionUser)}` };

const submission = {
  idType: 'BVN',
  idNumber: '22212345678',
  firstName: 'Ada',
  lastName: 'Obi',
  dateOfBirth: '1994-05-17',
};

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(sessionUser);
});

const submit = (body, headers = authed) =>
  server.json('/api/kyc', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('GET /api/kyc', () => {
  it('returns the current verification state', async () => {
    kyc.getKycStatus.mockResolvedValue({ kycStatus: 'PENDING', kycIdLast4: '5678' });
    const { status, body } = await server.json('/api/kyc', { headers: authed });

    expect(status).toBe(200);
    expect(body).toEqual({ kycStatus: 'PENDING', kycIdLast4: '5678' });
  });

  it('requires a session', async () => {
    expect((await server.json('/api/kyc')).status).toBe(401);
  });
});

describe('POST /api/kyc', () => {
  it('submits the details and answers 201', async () => {
    kyc.submitKyc.mockResolvedValue({ status: 'PENDING', message: 'Queued for review' });
    const { status, body } = await submit(submission);

    expect(status).toBe(201);
    expect(body.status).toBe('PENDING');
    expect(kyc.submitKyc).toHaveBeenCalledWith(expect.objectContaining({ id: 'usr_1' }), submission);
  });

  it('rejects an ID number that is not 11 digits', async () => {
    const { status, body } = await submit({ ...submission, idNumber: '1234' });

    expect(status).toBe(400);
    expect(body.error.message).toBe('BVN and NIN are 11 digits');
    expect(kyc.submitKyc).not.toHaveBeenCalled();
  });

  it('rejects an ID type it cannot check', async () => {
    const { status } = await submit({ ...submission, idType: 'PASSPORT' });
    expect(status).toBe(400);
  });

  it('rejects a trader under 18', async () => {
    const dob = new Date();
    dob.setUTCFullYear(dob.getUTCFullYear() - 16);
    const { status, body } = await submit({ ...submission, dateOfBirth: dob.toISOString().slice(0, 10) });

    expect(status).toBe(400);
    expect(body.error.message).toBe('You must be at least 18 years old');
  });

  it('passes a duplicate ID conflict through', async () => {
    const { conflict } = await import('../../src/lib/errors.js');
    kyc.submitKyc.mockRejectedValue(conflict('This ID is already linked to another Nexlm account'));

    const { status, body } = await submit(submission);
    expect(status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });
});
