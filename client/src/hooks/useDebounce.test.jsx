import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('ada'));
    expect(result.current).toBe('ada');
  });

  it('waits before reporting a new value', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), {
      initialProps: { value: '' },
    });

    rerender({ value: 'ad' });
    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe('ad');
  });

  it('only reports the last value while the user keeps typing', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 400), {
      initialProps: { value: '' },
    });

    for (const value of ['2', '25', '250']) {
      rerender({ value });
      act(() => vi.advanceTimersByTime(300));
    }
    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe('250');
  });

  it('honours a custom delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 50), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe('b');
  });
});
