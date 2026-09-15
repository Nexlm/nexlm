import { describe, expect, it } from 'vitest';
import { fromStroops } from '../../../src/lib/amount.js';

describe('fromStroops', () => {
  it('formats whole XLM without decimals', () => {
    expect(fromStroops(10_000_000n)).toBe('1');
    expect(fromStroops('0')).toBe('0');
  });

  it('trims trailing zeros', () => {
    expect(fromStroops(125_000_000)).toBe('12.5');
    expect(fromStroops(1n)).toBe('0.0000001');
  });

  it('keeps the sign of negative balances', () => {
    expect(fromStroops(-5n)).toBe('-0.0000005');
    expect(fromStroops(-20_000_000n)).toBe('-2');
  });
});
