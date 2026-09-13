/**
 * Thin emit helpers so services can publish realtime events without importing
 * the Socket.io server directly. All helpers are no-ops until `setIo` is called
 * (e.g. in tests or scripts).
 */
let io = null;

export const setIo = (instance) => {
  io = instance;
};

export const tradeRoom = (tradeId) => `trade:${tradeId}`;
export const userRoom = (userId) => `user:${userId}`;

export const emitToTrade = (tradeId, event, payload) => io?.to(tradeRoom(tradeId)).emit(event, payload);
export const emitToUser = (userId, event, payload) => io?.to(userRoom(userId)).emit(event, payload);
export const broadcast = (event, payload) => io?.emit(event, payload);
