import { io } from 'socket.io-client';
import { API_URL } from './config.js';

let socket = null;
let socketToken = null;

/**
 * Returns a socket authenticated with the given token, reconnecting if the
 * token changed. Serverless API deployments have no socket server, so
 * connection attempts are capped and pages fall back to polling.
 */
export function getSocket(token) {
  if (!token) return null;
  if (socket && socketToken === token) return socket;

  socket?.disconnect();
  socketToken = token;
  socket = io(API_URL || undefined, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    timeout: 8000,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
