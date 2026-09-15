import { describe, expect, it } from 'vitest';
import { addHours, addMinutes, isPast, secondsUntil } from '../../../src/lib/time.js';

const base = new Date('2026-09-01T12:00:00Z');

describe('addMinutes / addHours', () => {
  it('returns a new date without mutating the input', () => {
    const later = addMinutes(base, 15);
    expect(later.toISOString()).toBe('2026-09-01T12:15:00.000Z');
    expect(base.toISOString()).toBe('2026-09-01T12:00:00.000Z');
  });

  it('supports negative offsets', () => {
    expect(addMinutes(base, -30).toISOString()).toBe('2026-09-01T11:30:00.000Z');
  });

  it('adds hours', () => {
    expect(addHours(base, 24).toISOString()).toBe('2026-09-02T12:00:00.000Z');
  });
});

describe('isPast', () => {
  it('treats the exact deadline as past', () => {
    expect(isPast(base, base)).toBe(true);
  });

  it('accepts ISO strings', () => {
    expect(isPast('2026-09-01T11:59:59Z', base)).toBe(true);
    expect(isPast('2026-09-01T12:00:01Z', base)).toBe(false);
  });
});

describe('secondsUntil', () => {
  it('floors partial seconds', () => {
    expect(secondsUntil(new Date(base.getTime() + 1_999), base)).toBe(1);
  });

  it('never goes below zero', () => {
    expect(secondsUntil(addMinutes(base, -5), base)).toBe(0);
  });

  it('counts a full payment window', () => {
    expect(secondsUntil(addMinutes(base, 15), base)).toBe(900);
  });
});
