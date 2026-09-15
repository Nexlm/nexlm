import { beforeEach, describe, expect, it, vi } from 'vitest';
import { broadcast, emitToTrade, emitToUser, setIo, tradeRoom, userRoom } from '../../../src/socket/io.js';

const makeIo = () => {
  const emit = vi.fn();
  return { io: { to: vi.fn(() => ({ emit })), emit: vi.fn() }, emit };
};

beforeEach(() => setIo(null));

describe('room names', () => {
  it('namespaces trades and users', () => {
    expect(tradeRoom('t1')).toBe('trade:t1');
    expect(userRoom('u1')).toBe('user:u1');
  });
});

describe('emit helpers without a socket server', () => {
  it('do nothing instead of throwing (serverless, tests, scripts)', () => {
    expect(() => broadcast('order:created', { id: 'o1' })).not.toThrow();
    expect(emitToTrade('t1', 'message:new', {})).toBeUndefined();
    expect(emitToUser('u1', 'trade:updated', {})).toBeUndefined();
  });
});

describe('emit helpers with a socket server', () => {
  it('broadcasts market events to everyone', () => {
    const { io } = makeIo();
    setIo(io);
    broadcast('order:removed', { id: 'o1' });
    expect(io.emit).toHaveBeenCalledWith('order:removed', { id: 'o1' });
  });

  it('sends trade events to the trade room only', () => {
    const { io, emit } = makeIo();
    setIo(io);
    emitToTrade('t1', 'message:new', { id: 'm1' });
    expect(io.to).toHaveBeenCalledWith('trade:t1');
    expect(emit).toHaveBeenCalledWith('message:new', { id: 'm1' });
  });

  it('sends personal events to the user room only', () => {
    const { io, emit } = makeIo();
    setIo(io);
    emitToUser('u1', 'trade:created', { id: 't1' });
    expect(io.to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('trade:created', { id: 't1' });
  });
});
