import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: { user: { findFirst: vi.fn() } } }));

const { prisma } = await import('../../src/lib/prisma.js');
const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

describe('GET /', () => {
  it('describes the API', async () => {
    const { status, body } = await server.json('/');
    expect(status).toBe(200);
    expect(body).toMatchObject({ name: 'Nexlm API', status: 'ok', health: '/health' });
    expect(body.version).toBeTruthy();
  });
});

describe('GET /health', () => {
  it('reports the network and runtime', async () => {
    const { status, body } = await server.json('/health');
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', network: 'testnet', runtime: 'server', realtime: true });
    expect(Date.parse(body.time)).not.toBeNaN();
  });

  it('says which build answered', async () => {
    const { body } = await server.json('/health');
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('does not touch the database unless asked', async () => {
    await server.json('/health');
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('checks the database with ?deep', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const { status, body } = await server.json('/health?deep=1');
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('reports a missing schema as degraded', async () => {
    prisma.user.findFirst.mockRejectedValue(Object.assign(new Error('no table'), { code: 'P2021' }));
    const { status, body } = await server.json('/health?deep=1');
    expect(status).toBe(503);
    expect(body).toMatchObject({ status: 'degraded', database: 'migrations missing' });
  });

  it('reports an unreachable database as degraded', async () => {
    prisma.user.findFirst.mockRejectedValue(new Error('ECONNREFUSED'));
    const { body } = await server.json('/health?deep=1');
    expect(body.database).toBe('unreachable');
  });
});
