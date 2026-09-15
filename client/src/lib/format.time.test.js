import { describe, expect, it } from 'vitest';
import { formatCountdown, timeAgo } from './format.js';

const now = new Date('2026-09-01T12:00:00Z').getTime();
const ago = (ms) => new Date(now - ms).toISOString();

describe('timeAgo', () => {
  it('says "just now" for the last 45 seconds', () => {
    expect(timeAgo(ago(5_000), now)).toBe('just now');
    expect(timeAgo(ago(44_000), now)).toBe('just now');
  });

  it('counts minutes, hours and days', () => {
    expect(timeAgo(ago(5 * 60_000), now)).toBe('5m ago');
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe('3h ago');
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe('4d ago');
  });

  it('falls back to a date past a month', () => {
    expect(timeAgo(ago(60 * 86_400_000), now)).toMatch(/2026/);
  });
});

describe('formatCountdown', () => {
  it('formats mm:ss with padding', () => {
    expect(formatCountdown(905)).toBe('15:05');
    expect(formatCountdown(59)).toBe('00:59');
    expect(formatCountdown(0)).toBe('00:00');
  });

  it('clamps negatives so an expired timer reads 00:00', () => {
    expect(formatCountdown(-30)).toBe('00:00');
  });

  it('keeps counting past an hour', () => {
    expect(formatCountdown(3_665)).toBe('61:05');
  });
});
