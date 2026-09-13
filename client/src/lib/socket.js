import { io } from 'socket.io-client';

let socket = null;
let socketToken = null;

/** Returns a socket authenticated with the given token, reconnecting if the token changed. */
export function getSocket(token) {
  if (!token) return null;
  if (socket && socketToken === token) return socket;

  socket?.disconnect();
  socketToken = token;
  socket = io(import.meta.env.VITE_API_URL || undefined, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
