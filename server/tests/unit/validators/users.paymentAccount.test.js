import { describe, expect, it } from 'vitest';
import { paymentAccountBody, profileParams } from '../../../src/validators/users.js';

const wallet = { method: 'OPAY', accountName: 'Ada Obi', accountNumber: '8031234567' };

describe('paymentAccountBody', () => {
  it('accepts a mobile wallet without a bank name', () => {
    expect(paymentAccountBody.parse(wallet)).toEqual(wallet);
  });

  it('requires a bank name for bank transfers', () => {
    const result = paymentAccountBody.safeParse({ ...wallet, method: 'BANK_TRANSFER' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0]).toMatchObject({ path: ['bankName'], message: 'Bank name is required for bank transfers' });
    expect(paymentAccountBody.safeParse({ ...wallet, method: 'BANK_TRANSFER', bankName: 'GTBank' }).success).toBe(true);
  });

  it('requires a 10-digit NUBAN', () => {
    expect(paymentAccountBody.safeParse({ ...wallet, accountNumber: '123456789' }).success).toBe(false);
    expect(paymentAccountBody.safeParse({ ...wallet, accountNumber: '80312345678' }).success).toBe(false);
  });

  it('requires an account name', () => {
    expect(paymentAccountBody.safeParse({ ...wallet, accountName: ' ' }).success).toBe(false);
  });
});

describe('profileParams', () => {
  it('bounds display names in URLs', () => {
    expect(profileParams.safeParse({ displayName: 'ada' }).success).toBe(true);
    expect(profileParams.safeParse({ displayName: 'ad' }).success).toBe(false);
  });
});
