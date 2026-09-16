import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountdown } from './useCountdown.js';

const now = new Date('2026-09-01T12:00:00Z');
const inSeconds = (seconds) => new Date(now.getTime() + seconds * 1000).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => vi.useRealTimers());

describe('useCountdown', () => {
  it('starts at the seconds remaining', () => {
    const { result } = renderHook(() => useCountdown(inSeconds(90)));
    expect(result.current).toBe(90);
  });

  it('ticks down every second', () => {
    const { result } = renderHook(() => useCountdown(inSeconds(10)));
    act(() => vi.advanceTimersByTime(3_000));
    expect(result.current).toBe(7);
  });

  it('stops at zero instead of going negative', () => {
    const { result } = renderHook(() => useCountdown(inSeconds(2)));
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current).toBe(0);
  });

  it('is zero without a deadline', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current).toBe(0);
  });

  it('restarts when the deadline changes', () => {
    const { result, rerender } = renderHook(({ target }) => useCountdown(target), {
      initialProps: { target: inSeconds(10) },
    });
    rerender({ target: inSeconds(300) });
    expect(result.current).toBe(300);
  });

  it('clears its timer on unmount', () => {
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useCountdown(inSeconds(60)));
    unmount();
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });
});
