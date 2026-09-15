import { describe, expect, it } from 'vitest';
import {
  ALLOWED_IMAGE_TYPES,
  BASE_RESERVE_XLM,
  ESCROW_OVERHEAD_XLM,
  MAX_UPLOAD_BYTES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  TRADE_ACTIVE_STATUSES,
  TRADE_TERMINAL_STATUSES,
} from '../../../src/config/constants.js';
import { compareXlm, toStroops } from '../../../src/lib/amount.js';
import { EXTENSIONS } from '../../../src/lib/fileType.js';

describe('constants', () => {
  it('labels every payment method', () => {
    expect(Object.keys(PAYMENT_METHOD_LABELS).sort()).toEqual([...PAYMENT_METHODS].sort());
  });

  it('funds escrow with enough for the account minimum and signer subentry', () => {
    const minimum = toStroops(BASE_RESERVE_XLM) * 3n; // 2 base entries + 1 signer
    expect(toStroops(ESCROW_OVERHEAD_XLM) > minimum).toBe(true);
    expect(compareXlm(ESCROW_OVERHEAD_XLM, '5')).toBe(-1);
  });

  it('keeps active and terminal trade statuses disjoint', () => {
    expect(TRADE_ACTIVE_STATUSES.filter((s) => TRADE_TERMINAL_STATUSES.includes(s))).toEqual([]);
    expect(TRADE_ACTIVE_STATUSES.length + TRADE_TERMINAL_STATUSES.length).toBe(7);
  });

  it('only allows image types the sniffer can detect', () => {
    expect(ALLOWED_IMAGE_TYPES.every((type) => EXTENSIONS[type])).toBe(true);
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});
