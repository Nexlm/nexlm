import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

describe('useApi', () => {
  it('loads on mount', async () => {
    const fetcher = vi.fn(async () => ({ items: [1] }));
    const { result } = renderHook(() => useApi(fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ items: [1] });
    expect(result.current.error).toBeNull();
  });

  it('captures errors without throwing', async () => {
    const error = new Error('Could not reach Nexlm');
    const { result } = renderHook(() => useApi(async () => { throw error; }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(error);
  });

  it('refetches when dependencies change', async () => {
    const fetcher = vi.fn(async () => 'page');
    const { rerender } = renderHook(({ page }) => useApi(fetcher, [page]), { initialProps: { page: 1 } });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    rerender({ page: 2 });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('reloads silently without flashing the loading state', async () => {
    const fetcher = vi.fn(async () => 'data');
    const { result } = renderHook(() => useApi(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reload({ silent: true });
    });
    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('ignores a slow response that a newer request has replaced', async () => {
    const first = deferred();
    const fetcher = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce('second');

    const { result } = renderHook(() => useApi(fetcher));
    await act(async () => {
      result.current.reload();
      first.resolve('first');
      await first.promise;
    });

    await waitFor(() => expect(result.current.data).toBe('second'));
  });

  it('lets callers patch the data optimistically', async () => {
    const { result } = renderHook(() => useApi(async () => ({ count: 1 })));
    await waitFor(() => expect(result.current.data).toEqual({ count: 1 }));

    act(() => result.current.setData((data) => ({ count: data.count + 1 })));
    expect(result.current.data).toEqual({ count: 2 });
  });
});
