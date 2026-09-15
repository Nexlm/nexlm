import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, request, setAuthHandlers } from './api.js';

const jsonResponse = (status, body) => ({
  ok: status < 400,
  status,
  json: async () => body,
});

beforeEach(() => {
  setAuthHandlers({ getToken: () => null, onUnauthorized: () => {} });
});

afterEach(() => vi.unstubAllGlobals());

const stubFetch = (response) => {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('request', () => {
  it('calls the API under /api and returns the body', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { items: [] }));
    expect(await request('/orders')).toEqual({ items: [] });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/orders');
  });

  it('drops empty query values so the URL stays clean', async () => {
    const fetchMock = stubFetch(jsonResponse(200, {}));
    await api.get('/orders', { type: 'SELL', paymentMethod: '', page: undefined, minAmount: null });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/orders?type=SELL');
  });

  it('sends JSON bodies with the right header', async () => {
    const fetchMock = stubFetch(jsonResponse(200, {}));
    await api.post('/orders', { type: 'SELL' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"type":"SELL"}');
  });

  it('lets the browser set the boundary for uploads', async () => {
    const fetchMock = stubFetch(jsonResponse(200, {}));
    const form = new FormData();
    form.append('image', new Blob(['x']), 'proof.png');
    await api.post('/trades/t1/messages', form);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBe(form);
  });

  it('attaches the bearer token when logged in', async () => {
    setAuthHandlers({ getToken: () => 'tok' });
    const fetchMock = stubFetch(jsonResponse(200, {}));
    await request('/users/me');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('returns null for 204 responses', async () => {
    stubFetch({ ok: true, status: 204, json: async () => null });
    expect(await api.delete('/orders/o1')).toBeNull();
  });
});

describe('error handling', () => {
  it('throws ApiError with the server code and message', async () => {
    stubFetch(jsonResponse(409, { error: { code: 'CONFLICT', message: 'Order already taken', details: { id: 'o1' } } }));
    await expect(request('/trades')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'CONFLICT',
      message: 'Order already taken',
      details: { id: 'o1' },
    });
  });

  it('falls back to a generic message when the body has no error', async () => {
    stubFetch({ ok: false, status: 500, json: async () => { throw new Error('not json'); } });
    await expect(request('/orders')).rejects.toMatchObject({ code: 'HTTP_ERROR', message: 'Request failed (500)' });
  });

  it('logs the user out on 401 while authenticated', async () => {
    const onUnauthorized = vi.fn();
    setAuthHandlers({ getToken: () => 'tok', onUnauthorized });
    stubFetch(jsonResponse(401, { error: { code: 'SESSION_EXPIRED', message: 'Session expired' } }));
    await expect(request('/users/me')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('does not log out anonymous visitors on 401', async () => {
    const onUnauthorized = vi.fn();
    setAuthHandlers({ getToken: () => null, onUnauthorized });
    stubFetch(jsonResponse(401, { error: {} }));
    await expect(request('/orders')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('explains connection failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(request('/orders')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Could not reach Nexlm. Check your connection and try again.',
    });
  });

  it('rethrows aborts so cancelled requests stay silent', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw abort; }));
    await expect(request('/orders')).rejects.toBe(abort);
  });
});
