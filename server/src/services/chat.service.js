import { badRequest, conflict } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { emitToTrade } from '../socket/io.js';
import { getTradeForViewer } from './trade.service.js';
import { storeImage } from './upload.service.js';

/** Chat stays open for a day after a trade closes so parties can wrap up. */
const CLOSED_CHAT_GRACE_MS = 24 * 60 * 60 * 1000;

const messageInclude = { sender: { select: { id: true, displayName: true } } };

export async function listMessages(user, tradeId) {
  await getTradeForViewer(user, tradeId);
  return prisma.message.findMany({
    where: { tradeId },
    orderBy: { createdAt: 'asc' },
    include: messageInclude,
  });
}

function chatIsOpen(trade, now = Date.now()) {
  const closedAt = trade.completedAt ?? trade.cancelledAt;
  return !closedAt || now - closedAt.getTime() < CLOSED_CHAT_GRACE_MS;
}

export async function sendMessage(user, tradeId, { content, file }) {
  const trade = await getTradeForViewer(user, tradeId);
  if (!content && !file) throw badRequest('Write a message or attach an image');
  if (!chatIsOpen(trade)) throw conflict('Chat for this trade is closed');

  const imageUrl = file ? await storeImage(file, 'payment-proofs') : undefined;

  const message = await prisma.message.create({
    data: { tradeId, senderId: user.id, content, imageUrl },
    include: messageInclude,
  });

  emitToTrade(tradeId, 'message:new', message);
  return message;
}
