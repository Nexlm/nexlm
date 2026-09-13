import { describe, expect, it } from 'vitest';
import { addXlm, compareXlm, fromKobo, fromStroops, ngnTotal, subXlm, toKobo, toStroops } from '../src/lib/amount.js';

describe('XLM amounts', () => {
  it('converts to and from stroops exactly', () => {
    expect(toStroops('1')).toBe(10_000_000n);
    expect(toStroops('0.0000001')).toBe(1n);
    expect(toStroops('123.4567891')).toBe(1_234_567_891n);
    expect(fromStroops(1_234_567_891n)).toBe('123.4567891');
    expect(fromStroops(10_000_000n)).toBe('1');
    expect(fromStroops(15_000_000n)).toBe('1.5');
  });

  it('rejects malformed values', () => {
    expect(() => toStroops('1.12345678')).toThrow();
    expect(() => toStroops('-1')).toThrow();
    expect(() => toStroops('abc')).toThrow();
    expect(() => toStroops('')).toThrow();
  });

  it('accepts decimal-like objects', () => {
    const decimal = { toFixed: (dp) => (12.5).toFixed(dp) };
    expect(toStroops(decimal)).toBe(125_000_000n);
  });

  it('adds, subtracts and compares without float drift', () => {
    expect(addXlm('0.1', '0.2')).toBe('0.3');
    expect(subXlm('1', '0.0000001')).toBe('0.9999999');
    expect(subXlm('1', '2')).toBe('-1');
    expect(compareXlm('10', '9.9999999')).toBe(1);
    expect(compareXlm('5', '5.0')).toBe(0);
    expect(compareXlm('1', '2')).toBe(-1);
  });
});

describe('NGN amounts', () => {
  it('converts kobo', () => {
    expect(toKobo('1500.5')).toBe(150_050n);
    expect(fromKobo(150_050n)).toBe('1500.50');
  });

  it('computes trade totals rounded half-up to the kobo', () => {
    expect(ngnTotal('100', '520.25')).toBe('52025.00');
    expect(ngnTotal('0.0000001', '500')).toBe('0.00');
    expect(ngnTotal('1.2345678', '999.99')).toBe('1234.56');
    expect(ngnTotal('0.001', '5')).toBe('0.01');
  });
});
