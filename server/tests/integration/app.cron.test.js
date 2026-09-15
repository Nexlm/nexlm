import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: {} }));
vi.mock('../../src/jobs/runDueJobs.js', () => ({ runDueJobs: vi.fn(async () => ({ expiredOrders: 2 })) }));

const { runDueJobs } = await import('../../src/jobs/runDueJobs.js');
const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

describe('GET /api/cron/tick', () => {
  it('refuses requests without the cron secret', async () => {
    const { status, body } = await server.json('/api/cron/tick');
    expect(status).toBe(401);
    expect(body.error.message).toBe('Invalid cron secret');
    expect(runDueJobs).not.toHaveBeenCalled();
  });

  it('refuses a wrong bearer token', async () => {
    const { status } = await server.json('/api/cron/tick', { headers: { Authorization: 'Bearer wrong' } });
    expect(status).toBe(401);
  });
});
