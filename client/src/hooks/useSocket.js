import { useEffect, useRef, useState } from 'react';
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

/** Whether the realtime socket is currently connected. */
export function useSocketConnected() {
  const socket = useSocket();
  const [connected, setConnected] = useState(Boolean(socket?.connected));

  useEffect(() => {
    if (!socket) {
      setConnected(false);
      return undefined;
    }
    setConnected(socket.connected);
    const up = () => setConnected(true);
    const down = () => setConnected(false);
    socket.on('connect', up);
    socket.on('disconnect', down);
    socket.on('connect_error', down);
    return () => {
      socket.off('connect', up);
      socket.off('disconnect', down);
      socket.off('connect_error', down);
    };
  }, [socket]);

  return connected;
}

/**
 * Calls `refresh` on an interval while realtime isn't available (logged-out
 * visitors, or a serverless API without sockets). Pauses in background tabs.
 */
export function useLiveRefresh(refresh, intervalMs = 5000) {
  const connected = useSocketConnected();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (connected) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshRef.current();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [connected, intervalMs]);

  return connected;
}
