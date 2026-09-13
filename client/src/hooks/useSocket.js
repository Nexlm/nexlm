import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket.js';
import { useAuthStore } from '../store/authStore.js';

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  return token ? getSocket(token) : null;
}

/** Subscribes to a socket event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const socket = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (payload) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}
