import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: {} }));

const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

describe('unknown routes', () => {
  it('answers with JSON, not an HTML error page', async () => {
    const { status, headers, body } = await server.json('/nope');
    expect(status).toBe(404);
    expect(headers.get('content-type')).toContain('application/json');
    expect(body.error).toEqual({ code: 'ROUTE_NOT_FOUND', message: 'Route GET /nope not found' });
  });

  it('names the method that was used', async () => {
    const { body } = await server.json('/api/does-not-exist', { method: 'POST' });
    expect(body.error.message).toBe('Route POST /api/does-not-exist not found');
  });
});

describe('malformed requests', () => {
  it('explains invalid JSON bodies', async () => {
    const { status, body } = await server.json('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not json',
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe('INVALID_JSON');
  });
});

describe('security headers', () => {
  it('sets helmet defaults and hides the framework', async () => {
    const response = await server.call('/');
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('returns a request id that can be quoted in a bug report', async () => {
    const response = await server.call('/');
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('keeps an id set by a proxy', async () => {
    const response = await server.call('/', { headers: { 'X-Request-Id': 'edge-7f3a91c4' } });
    expect(response.headers.get('x-request-id')).toBe('edge-7f3a91c4');
  });

  it('allows the configured client origin', async () => {
    const response = await server.call('/', { headers: { Origin: 'http://localhost:5173' } });
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });
});
