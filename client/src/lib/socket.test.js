import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ disconnect: vi.fn(), on: vi.fn(), off: vi.fn() })),
}));

const { io } = await import('socket.io-client');
const { disconnectSocket, getSocket } = await import('./socket.js');

beforeEach(() => {
  disconnectSocket();
  vi.clearAllMocks();
});

describe('getSocket', () => {
  it('returns nothing for logged-out visitors', () => {
    expect(getSocket(null)).toBeNull();
    expect(io).not.toHaveBeenCalled();
  });

  it('reuses one connection per token', () => {
    expect(getSocket('tok')).toBe(getSocket('tok'));
    expect(io).toHaveBeenCalledTimes(1);
  });

  it('reconnects when the user changes', () => {
    const first = getSocket('tok');
    const second = getSocket('other');
    expect(second).not.toBe(first);
    expect(first.disconnect).toHaveBeenCalled();
  });

  it('authenticates with the token and gives up after a few attempts', () => {
    getSocket('tok');
    expect(io.mock.calls[0][1]).toMatchObject({ auth: { token: 'tok' }, reconnectionAttempts: 5 });
  });

  it('disconnects and forgets the socket on logout', () => {
    const socket = getSocket('tok');
    disconnectSocket();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(getSocket('tok')).not.toBe(socket);
  });
});
