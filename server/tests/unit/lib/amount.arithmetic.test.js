import { describe, expect, it } from 'vitest';
import { addXlm, compareXlm, subXlm } from '../../../src/lib/amount.js';

describe('addXlm', () => {
  it('adds without floating point drift', () => {
    expect(addXlm('0.1', '0.2')).toBe('0.3');
    expect(addXlm('1', '2.5', '0.0000001')).toBe('3.5000001');
  });

  it('returns zero for no values', () => {
    expect(addXlm()).toBe('0');
  });
});

describe('subXlm', () => {
  it('subtracts exactly', () => {
    expect(subXlm('10', '2.5')).toBe('7.5');
    expect(subXlm('0.3', '0.1')).toBe('0.2');
  });

  it('can go negative so callers can detect shortfalls', () => {
    expect(subXlm('1', '2')).toBe('-1');
  });
});

describe('compareXlm', () => {
  it('treats equal values with different formatting as equal', () => {
    expect(compareXlm('1', '1.0000000')).toBe(0);
  });

  it('orders values', () => {
    expect(compareXlm('2', '1')).toBe(1);
    expect(compareXlm('0.1', '0.2')).toBe(-1);
  });
});
