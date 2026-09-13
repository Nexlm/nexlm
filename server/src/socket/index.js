import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../middleware/auth.js';
import { setIo, tradeRoom, userRoom } from './io.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const { sub } = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: sub },
        select: { id: true, role: true, status: true },
      });
      if (!user || user.status !== 'ACTIVE') return next(new Error('unauthorized'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    socket.join(userRoom(user.id));

    socket.on('trade:join', async (tradeId, ack) => {
      try {
        const trade = await prisma.trade.findUnique({
          where: { id: String(tradeId) },
          select: { buyerId: true, sellerId: true },
        });
        const allowed =
          Boolean(trade) && (trade.buyerId === user.id || trade.sellerId === user.id || user.role === 'ADMIN');
        if (allowed) socket.join(tradeRoom(tradeId));
        if (typeof ack === 'function') ack({ ok: allowed });
      } catch (err) {
        logger.warn('trade:join failed', { err });
        if (typeof ack === 'function') ack({ ok: false });
      }
    });

    socket.on('trade:leave', (tradeId) => socket.leave(tradeRoom(tradeId)));

    socket.on('trade:typing', ({ tradeId } = {}) => {
      const room = tradeRoom(tradeId);
      if (socket.rooms.has(room)) socket.to(room).emit('trade:typing', { tradeId, userId: user.id });
    });
  });

  setIo(io);
  return io;
}
