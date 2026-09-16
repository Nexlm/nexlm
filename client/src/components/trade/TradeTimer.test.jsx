import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TradeTimer } from './TradeTimer.jsx';

const now = new Date('2026-09-01T12:00:00Z');
const inSeconds = (seconds) => new Date(now.getTime() + seconds * 1000).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => vi.useRealTimers());

describe('TradeTimer', () => {
  it('counts down from the deadline', () => {
    render(<TradeTimer deadline={inSeconds(900)} />);
    expect(screen.getByText('15:00')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('is announced as a live timer', () => {
    render(<TradeTimer deadline={inSeconds(900)} />);
    const timer = screen.getByRole('timer');
    expect(timer).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Time left to pay')).toBeInTheDocument();
  });

  it('turns urgent in the last two minutes', () => {
    render(<TradeTimer deadline={inSeconds(115)} />);
    expect(screen.getByText('01:55').className).toContain('text-ember');
  });

  it('says the window is closed at zero', () => {
    render(<TradeTimer deadline={inSeconds(-30)} />);
    expect(screen.getByText('Payment window closed')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<TradeTimer deadline={inSeconds(600)} label="Offer expires in" />);
    expect(screen.getByText('Offer expires in')).toBeInTheDocument();
  });
});
