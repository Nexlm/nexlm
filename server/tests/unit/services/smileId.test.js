import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/config/env.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    env: { ...actual.env, SMILE_PARTNER_ID: '0001', SMILE_API_KEY: 'test-api-key', SMILE_ENV: 'sandbox' },
  };
});

const { isSmileConfigured, verifyNigerianId } = await import('../../../src/services/smileId.js');

const submission = {
  userId: 'usr_1',
  idType: 'BVN',
  idNumber: '22212345678',
  firstName: 'Ada',
  lastName: 'Obi',
  dateOfBirth: '1994-05-17',
};

const stubFetch = (impl) => {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => vi.unstubAllGlobals());

describe('isSmileConfigured', () => {
  it('is true once partner credentials are set', () => {
    expect(isSmileConfigured()).toBe(true);
  });
});

describe('verifyNigerianId', () => {
  it('verifies when the ID exists and the names match', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ Actions: { Verify_ID_Number: 'Verified', Names: 'Exact Match' }, ResultCode: '1012' }),
    }));
    const result = await verifyNigerianId(submission);
    expect(result).toMatchObject({ verified: true, resultCode: '1012' });
    expect(result.jobId).toMatch(/^nexlm-[a-f0-9]{16}$/);
  });

  it('fails verification when the names do not match', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ Actions: { Verify_ID_Number: 'Verified', Names: 'No Match' } }),
    }));
    expect((await verifyNigerianId(submission)).verified).toBe(false);
  });

  it('fails verification when the ID number is not found', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ Actions: { Verify_ID_Number: 'Not Verified', Names: 'Exact Match' } }),
    }));
    expect((await verifyNigerianId(submission)).verified).toBe(false);
  });

  it('accepts a partial name match', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ Actions: { Verify_ID_Number: 'Verified', Names: 'Partial Match' } }),
    }));
    expect((await verifyNigerianId(submission)).verified).toBe(true);
  });

  it('signs the request and sends the sandbox endpoint the submitted details', async () => {
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => ({ Actions: {} }) }));
    await verifyNigerianId(submission);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://testapi.smileidentity.com/v1/id_verification');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ country: 'NG', id_type: 'BVN', id_number: '22212345678', partner_id: '0001' });
    expect(body.signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('sends the NIN_V2 id type for NIN submissions', async () => {
    const fetchMock = stubFetch(async () => ({ ok: true, json: async () => ({ Actions: {} }) }));
    await verifyNigerianId({ ...submission, idType: 'NIN' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).id_type).toBe('NIN_V2');
  });

  it('reports provider outages as a service error', async () => {
    stubFetch(async () => ({ ok: false, status: 503 }));
    await expect(verifyNigerianId(submission)).rejects.toMatchObject({ status: 503, code: 'KYC_PROVIDER_ERROR' });
  });

  it('reports network failures as a service error', async () => {
    stubFetch(async () => {
      throw new Error('ECONNRESET');
    });
    await expect(verifyNigerianId(submission)).rejects.toMatchObject({ code: 'KYC_PROVIDER_ERROR' });
  });
});
