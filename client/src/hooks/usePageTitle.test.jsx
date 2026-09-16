import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePageTitle } from './usePageTitle.js';

beforeEach(() => {
  document.title = 'Nexlm — P2P Stellar Exchange';
});

describe('usePageTitle', () => {
  it('names the screen in front of the product', () => {
    renderHook(() => usePageTitle('Wallet'));
    expect(document.title).toBe('Wallet · Nexlm');
  });

  it('falls back to the product name', () => {
    renderHook(() => usePageTitle(undefined));
    expect(document.title).toBe('Nexlm');
  });

  it('updates when the screen changes', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), { initialProps: { title: 'Wallet' } });
    rerender({ title: 'Trade trd_1' });
    expect(document.title).toBe('Trade trd_1 · Nexlm');
  });

  it('restores the previous title on unmount', () => {
    const { unmount } = renderHook(() => usePageTitle('Wallet'));
    unmount();
    expect(document.title).toBe('Nexlm — P2P Stellar Exchange');
  });
});
