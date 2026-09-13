import { describe, expect, it } from 'vitest';
import { estimateNgn, formatCountdown, formatPercent, formatXlm, shortAddress, timeAgo } from './format.js';

describe('format helpers', () => {
  it('formats XLM with up to 7 decimals', () => {
    expect(formatXlm('1234.5')).toBe('1,234.5 XLM');
    expect(formatXlm('0.1234567')).toBe('0.1234567 XLM');
    expect(formatXlm(10, { suffix: false })).toBe('10');
  });

  it('shortens Stellar addresses', () => {
    expect(shortAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW')).toBe('GABC…TUVW');
    expect(shortAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW', 6)).toBe('GABCDE…RSTUVW');
    expect(shortAddress(undefined)).toBe('');
  });

  it('formats countdowns as mm:ss', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(900)).toBe('15:00');
    expect(formatCountdown(-5)).toBe('00:00');
  });

  it('describes relative times', () => {
    const now = new Date('2026-09-01T12:00:00Z').getTime();
    expect(timeAgo(new Date(now - 10_000), now)).toBe('just now');
    expect(timeAgo(new Date(now - 5 * 60_000), now)).toBe('5m ago');
    expect(timeAgo(new Date(now - 3 * 3_600_000), now)).toBe('3h ago');
    expect(timeAgo(new Date(now - 2 * 86_400_000), now)).toBe('2d ago');
  });

  it('estimates NGN totals and handles bad input', () => {
    expect(estimateNgn('100', '520.25')).toBe(52025);
    expect(estimateNgn('abc', '500')).toBe(0);
  });

  it('shows a dash for missing percentages', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(98.5)).toBe('98.5%');
  });
});
