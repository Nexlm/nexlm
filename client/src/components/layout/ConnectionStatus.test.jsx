import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const connected = { value: false };

vi.mock('../../hooks/useSocket.js', () => ({
  useSocket: () => null,
  useSocketEvent: vi.fn(),
  useLiveRefresh: vi.fn(),
  useSocketConnected: () => connected.value,
}));

const { ConnectionStatus } = await import('./ConnectionStatus.jsx');

beforeEach(() => {
  connected.value = false;
});

describe('ConnectionStatus', () => {
  it('says updates are polled when there is no socket', () => {
    render(<ConnectionStatus />);
    expect(screen.getByText('Polling')).toBeInTheDocument();
    expect(screen.getByTitle('Updates refresh every few seconds')).toBeInTheDocument();
  });

  it('says live once the socket connects', () => {
    connected.value = true;
    render(<ConnectionStatus />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByTitle('Updates arrive instantly')).toBeInTheDocument();
  });

  it('colours the dot by state', () => {
    const { unmount } = render(<ConnectionStatus />);
    expect(document.querySelector('span[aria-hidden]').className).toContain('bg-gold');
    unmount();

    connected.value = true;
    render(<ConnectionStatus />);
    expect(document.querySelector('span[aria-hidden]').className).toContain('bg-mint');
  });
});
