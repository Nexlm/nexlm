import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: { message: { findMany: vi.fn(), create: vi.fn() } },
}));
vi.mock('../../../src/socket/io.js', () => ({ emitToTrade: vi.fn() }));
vi.mock('../../../src/services/trade.service.js', () => ({ getTradeForViewer: vi.fn() }));
vi.mock('../../../src/services/upload.service.js', () => ({ storeImage: vi.fn() }));

const { prisma } = await import('../../../src/lib/prisma.js');
const { emitToTrade } = await import('../../../src/socket/io.js');
const { getTradeForViewer } = await import('../../../src/services/trade.service.js');
const { storeImage } = await import('../../../src/services/upload.service.js');
const { listMessages, sendMessage } = await import('../../../src/services/chat.service.js');

const user = { id: 'buyer' };
const openTrade = { id: 't1', completedAt: null, cancelledAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  getTradeForViewer.mockResolvedValue(openTrade);
  prisma.message.create.mockImplementation(async ({ data }) => ({ id: 'm1', ...data }));
  storeImage.mockResolvedValue('https://cdn.example/proof.png');
});

describe('listMessages', () => {
  it('checks access before reading the room', async () => {
    prisma.message.findMany.mockResolvedValue([]);
    await listMessages(user, 't1');
    expect(getTradeForViewer).toHaveBeenCalledWith(user, 't1');
    expect(prisma.message.findMany.mock.calls[0][0]).toMatchObject({
      where: { tradeId: 't1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('refuses viewers who are not part of the trade', async () => {
    getTradeForViewer.mockRejectedValue(Object.assign(new Error('forbidden'), { status: 403 }));
    await expect(listMessages(user, 't1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('sendMessage', () => {
  it('posts a text message and pushes it to the room', async () => {
    const message = await sendMessage(user, 't1', { content: 'Sent via OPay' });
    expect(message).toMatchObject({ tradeId: 't1', senderId: 'buyer', content: 'Sent via OPay' });
    expect(emitToTrade).toHaveBeenCalledWith('t1', 'message:new', message);
  });

  it('stores payment proof images', async () => {
    const file = { buffer: Buffer.from('x') };
    const message = await sendMessage(user, 't1', { file });
    expect(storeImage).toHaveBeenCalledWith(file, 'payment-proofs');
    expect(message.imageUrl).toBe('https://cdn.example/proof.png');
  });

  it('requires text or an image', async () => {
    await expect(sendMessage(user, 't1', {})).rejects.toMatchObject({
      status: 400,
      message: 'Write a message or attach an image',
    });
  });

  it('stays open for a day after the trade closes', async () => {
    getTradeForViewer.mockResolvedValue({ ...openTrade, completedAt: new Date(Date.now() - 3_600_000) });
    await expect(sendMessage(user, 't1', { content: 'thanks' })).resolves.toBeTruthy();
  });

  it('closes once the grace period has passed', async () => {
    getTradeForViewer.mockResolvedValue({ ...openTrade, cancelledAt: new Date(Date.now() - 25 * 3_600_000) });
    await expect(sendMessage(user, 't1', { content: 'hello?' })).rejects.toMatchObject({
      status: 409,
      message: 'Chat for this trade is closed',
    });
  });
});
