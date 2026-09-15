import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToastStore } from './toastStore.js';

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => vi.useRealTimers());

const toasts = () => useToastStore.getState().toasts;

describe('toast store', () => {
  it('adds a toast with a default tone', () => {
    useToastStore.getState().push({ message: 'Saved' });
    expect(toasts()).toEqual([{ id: expect.any(Number), tone: 'info', message: 'Saved' }]);
  });

  it('dismisses itself after the timeout', () => {
    useToastStore.getState().push({ message: 'Saved' });
    vi.advanceTimersByTime(5_000);
    expect(toasts()).toEqual([]);
  });

  it('honours a custom duration', () => {
    useToastStore.getState().push({ message: 'Slow', duration: 10_000 });
    vi.advanceTimersByTime(5_000);
    expect(toasts()).toHaveLength(1);
    vi.advanceTimersByTime(5_000);
    expect(toasts()).toHaveLength(0);
  });

  it('stacks toasts and gives each a unique id', () => {
    const first = useToastStore.getState().push({ message: 'One' });
    const second = useToastStore.getState().push({ message: 'Two' });
    expect(first).not.toBe(second);
    expect(toasts()).toHaveLength(2);
  });

  it('dismisses a single toast on demand', () => {
    const id = useToastStore.getState().push({ message: 'One' });
    useToastStore.getState().push({ message: 'Two' });
    useToastStore.getState().dismiss(id);
    expect(toasts().map((t) => t.message)).toEqual(['Two']);
  });
});

describe('toast helpers', () => {
  it('sets the tone', () => {
    toast.success('Trade completed');
    toast.info('Waiting for payment');
    expect(toasts().map((t) => t.tone)).toEqual(['success', 'info']);
  });

  it('accepts an error object and uses its message', () => {
    toast.error(new Error('Order already taken'));
    expect(toasts()[0]).toMatchObject({ tone: 'error', message: 'Order already taken' });
  });

  it('falls back when the error has no message', () => {
    toast.error(undefined);
    expect(toasts()[0].message).toBe('Something went wrong');
  });
});
