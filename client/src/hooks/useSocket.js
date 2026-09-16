import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { getSocket } from '../lib/socket.js';
import { useAuthStore } from '../store/authStore.js';

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  return token ? getSocket(token) : null;
}

/** Keeps a callback in a ref without touching it during render. */
function useLatest(value) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Subscribes to a socket event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const socket = useSocket();
  const handlerRef = useLatest(handler);

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (payload) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event, handlerRef]);
}

/**
 * Whether the realtime socket is currently connected. Read straight from the
 * socket rather than mirrored into state, so there is no extra render on connect.
 */
export function useSocketConnected() {
  const socket = useSocket();

  const subscribe = useCallback(
    (onChange) => {
      if (!socket) return () => {};
      for (const event of ['connect', 'disconnect', 'connect_error']) socket.on(event, onChange);
      return () => {
        for (const event of ['connect', 'disconnect', 'connect_error']) socket.off(event, onChange);
      };
    },
    [socket],
  );

  return useSyncExternalStore(
    subscribe,
    () => Boolean(socket?.connected),
    () => false,
  );
}

/**
 * Calls `refresh` on an interval while realtime isn't available (logged-out
 * visitors, or a serverless API without sockets). Pauses in background tabs.
 */
export function useLiveRefresh(refresh, intervalMs = 5000) {
  const connected = useSocketConnected();
  const refreshRef = useLatest(refresh);

  useEffect(() => {
    if (connected) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshRef.current();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [connected, intervalMs, refreshRef]);

  return connected;
}
