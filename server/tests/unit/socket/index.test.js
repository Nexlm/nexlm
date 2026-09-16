import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('socket.io', () => {
  class Server {
    constructor(httpServer, options) {
      this.httpServer = httpServer;
      this.options = options;
      this.middleware = [];
      this.handlers = {};
      this.to = vi.fn(() => ({ emit: vi.fn() }));
      this.emit = vi.fn();
    }

    use(fn) {
      this.middleware.push(fn);
    }

    on(event, handler) {
      this.handlers[event] = handler;
    }
  }
  return { Server };
});
vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: { user: { findUnique: vi.fn() }, trade: { findUnique: vi.fn() } },
}));

const { prisma } = await import('../../../src/lib/prisma.js');
const { signAccessToken } = await import('../../../src/middleware/auth.js');
const { initSocket } = await import('../../../src/socket/index.js');

const activeUser = { id: 'usr_1', role: 'USER', status: 'ACTIVE' };
const token = signAccessToken(activeUser);

const fakeSocket = (overrides = {}) => ({
  handshake: { auth: { token } },
  data: {},
  rooms: new Set(),
  join: vi.fn(),
  leave: vi.fn(),
  to: vi.fn(() => ({ emit: vi.fn() })),
  on: vi.fn(),
  ...overrides,
});

const connect = (io, socket) => {
  const listeners = {};
  socket.on.mockImplementation((event, handler) => {
    listeners[event] = handler;
  });
  io.handlers.connection(socket);
  return listeners;
};

let io;
beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(activeUser);
  io = initSocket({});
});

describe('socket authentication', () => {
  const authenticate = (socket) =>
    new Promise((resolve) => {
      io.middleware[0](socket, resolve);
    });

  it('accepts a valid token and remembers the user', async () => {
    const socket = fakeSocket();
    expect(await authenticate(socket)).toBeUndefined();
    expect(socket.data.user).toEqual(activeUser);
  });

  it('rejects a connection with no token', async () => {
    const error = await authenticate(fakeSocket({ handshake: { auth: {} } }));
    expect(error.message).toBe('unauthorized');
  });

  it('rejects a forged token', async () => {
    const error = await authenticate(fakeSocket({ handshake: { auth: { token: 'garbage' } } }));
    expect(error.message).toBe('unauthorized');
  });

  it('rejects suspended and deleted accounts', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...activeUser, status: 'SUSPENDED' });
    expect((await authenticate(fakeSocket())).message).toBe('unauthorized');

    prisma.user.findUnique.mockResolvedValue(null);
    expect((await authenticate(fakeSocket())).message).toBe('unauthorized');
  });
});

describe('socket rooms', () => {
  it('puts every connection in its own user room', () => {
    const socket = fakeSocket({ data: { user: activeUser } });
    connect(io, socket);
    expect(socket.join).toHaveBeenCalledWith('user:usr_1');
  });

  it('lets a participant join the trade room', async () => {
    prisma.trade.findUnique.mockResolvedValue({ buyerId: 'usr_1', sellerId: 'seller' });
    const socket = fakeSocket({ data: { user: activeUser } });
    const listeners = connect(io, socket);

    const ack = vi.fn();
    await listeners['trade:join']('trd_1', ack);
    expect(socket.join).toHaveBeenCalledWith('trade:trd_1');
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });

  it('keeps outsiders out of the trade room', async () => {
    prisma.trade.findUnique.mockResolvedValue({ buyerId: 'someone', sellerId: 'else' });
    const socket = fakeSocket({ data: { user: activeUser } });
    const listeners = connect(io, socket);

    const ack = vi.fn();
    await listeners['trade:join']('trd_1', ack);
    expect(socket.join).not.toHaveBeenCalledWith('trade:trd_1');
    expect(ack).toHaveBeenCalledWith({ ok: false });
  });

  it('lets admins watch any trade', async () => {
    prisma.trade.findUnique.mockResolvedValue({ buyerId: 'a', sellerId: 'b' });
    const socket = fakeSocket({ data: { user: { ...activeUser, role: 'ADMIN' } } });
    const listeners = connect(io, socket);

    await listeners['trade:join']('trd_1', vi.fn());
    expect(socket.join).toHaveBeenCalledWith('trade:trd_1');
  });

  it('answers a join for an unknown trade without throwing', async () => {
    prisma.trade.findUnique.mockResolvedValue(null);
    const socket = fakeSocket({ data: { user: activeUser } });
    const listeners = connect(io, socket);

    const ack = vi.fn();
    await listeners['trade:join']('nope', ack);
    expect(ack).toHaveBeenCalledWith({ ok: false });
  });

  it('leaves the room on request', () => {
    const socket = fakeSocket({ data: { user: activeUser } });
    const listeners = connect(io, socket);

    listeners['trade:leave']('trd_1');
    expect(socket.leave).toHaveBeenCalledWith('trade:trd_1');
  });
});

describe('typing indicator', () => {
  it('only relays typing inside a room the socket joined', () => {
    const socket = fakeSocket({ data: { user: activeUser }, rooms: new Set(['trade:trd_1']) });
    const listeners = connect(io, socket);

    listeners['trade:typing']({ tradeId: 'trd_1' });
    expect(socket.to).toHaveBeenCalledWith('trade:trd_1');

    socket.to.mockClear();
    listeners['trade:typing']({ tradeId: 'other' });
    expect(socket.to).not.toHaveBeenCalled();
  });
});
