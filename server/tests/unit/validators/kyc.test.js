import { describe, expect, it } from 'vitest';
import { submitKycBody } from '../../../src/validators/kyc.js';

const valid = {
  idType: 'BVN',
  idNumber: '22212345678',
  firstName: 'Chiamaka',
  lastName: "O'Neil-Adeyemi",
  dateOfBirth: '1994-05-17',
};

const yearsAgo = (years) => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - years);
  return date.toISOString().slice(0, 10);
};

describe('submitKycBody', () => {
  it('accepts a complete BVN submission', () => {
    expect(submitKycBody.parse(valid)).toEqual(valid);
  });

  it('accepts NIN', () => {
    expect(submitKycBody.safeParse({ ...valid, idType: 'NIN' }).success).toBe(true);
  });

  it('requires an 11-digit ID number', () => {
    expect(submitKycBody.safeParse({ ...valid, idNumber: '1234567890' }).success).toBe(false);
    expect(submitKycBody.safeParse({ ...valid, idNumber: '2221234567a' }).success).toBe(false);
  });

  it('allows accented names but not symbols', () => {
    expect(submitKycBody.safeParse({ ...valid, firstName: 'Adébáyọ̀' }).success).toBe(true);
    expect(submitKycBody.safeParse({ ...valid, firstName: 'Ada<script>' }).success).toBe(false);
  });

  it('requires the date format', () => {
    expect(submitKycBody.safeParse({ ...valid, dateOfBirth: '17/05/1994' }).success).toBe(false);
    expect(submitKycBody.safeParse({ ...valid, dateOfBirth: '1994-13-45' }).success).toBe(false);
  });

  it('requires traders to be adults', () => {
    const result = submitKycBody.safeParse({ ...valid, dateOfBirth: yearsAgo(17) });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('You must be at least 18 years old');
    expect(submitKycBody.safeParse({ ...valid, dateOfBirth: yearsAgo(19) }).success).toBe(true);
  });
});
