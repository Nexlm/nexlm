import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({ prisma: {} }));
vi.mock('../../src/services/order.service.js', () => ({
  listOrders: vi.fn(async () => ({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1, hasMore: false } })),
  listMyOrders: vi.fn(),
  getOrder: vi.fn(),
  createOrder: vi.fn(),
  cancelOrder: vi.fn(),
}));

const orders = await import('../../src/services/order.service.js');
const { createApp } = await import('../../src/app.js');
const { startTestServer } = await import('../helpers/httpServer.js');

let server;
beforeAll(async () => {
  server = await startTestServer(createApp());
});
afterAll(() => server.close());

describe('GET /api/orders', () => {
  it('is public and applies query defaults', async () => {
    const { status } = await server.json('/api/orders');
    expect(status).toBe(200);
    expect(orders.listOrders).toHaveBeenCalledWith({ type: 'SELL', page: 1, pageSize: 20 });
  });

  it('passes validated filters to the service', async () => {
    await server.json('/api/orders?type=BUY&paymentMethod=KUDA&page=2');
    expect(orders.listOrders).toHaveBeenLastCalledWith({ type: 'BUY', paymentMethod: 'KUDA', page: 2, pageSize: 20 });
  });

  it('rejects an oversized page and names the problem', async () => {
    const { status, body } = await server.json('/api/orders?pageSize=500');
    expect(status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0].path).toBe('pageSize');
  });

  it('rejects unsupported payment methods', async () => {
    const { status, body } = await server.json('/api/orders?paymentMethod=PAYPAL');
    expect(status).toBe(400);
    expect(body.error.message).toBe('Unsupported payment method');
  });
});

describe('protected order routes', () => {
  it('requires a session to post an order', async () => {
    const { status, body } = await server.json('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SELL', xlmAmount: '10', ngnRate: '1500', paymentMethods: ['OPAY'] }),
    });
    expect(status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(orders.createOrder).not.toHaveBeenCalled();
  });

  it('requires a session to list your own orders', async () => {
    expect((await server.json('/api/orders/mine')).status).toBe(401);
  });

  it('requires a session to cancel', async () => {
    expect((await server.json('/api/orders/o1/cancel', { method: 'POST' })).status).toBe(401);
  });
});
