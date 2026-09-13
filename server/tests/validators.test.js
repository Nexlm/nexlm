import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { registerBody } from '../src/validators/auth.js';
import { createOrderBody } from '../src/validators/orders.js';
import { submitKycBody } from '../src/validators/kyc.js';
import { nigerianPhone, paymentAccountBody } from '../src/validators/users.js';
import { withdrawBody } from '../src/validators/wallet.js';

describe('registerBody', () => {
  it('normalises email and accepts a valid payload', () => {
    const parsed = registerBody.parse({ email: '  Amaka@Example.COM ', password: 'naira2026', displayName: 'amaka_ng' });
    expect(parsed.email).toBe('amaka@example.com');
  });

  it('rejects weak passwords and bad display names', () => {
    expect(registerBody.safeParse({ email: 'a@b.co', password: 'short', displayName: 'amaka' }).success).toBe(false);
    expect(registerBody.safeParse({ email: 'a@b.co', password: 'onlyletters', displayName: 'amaka' }).success).toBe(false);
    expect(registerBody.safeParse({ email: 'a@b.co', password: 'naira2026', displayName: 'a b' }).success).toBe(false);
  });
});

describe('createOrderBody', () => {
  const base = { type: 'SELL', xlmAmount: '150.5', ngnRate: '520.25', paymentMethods: ['OPAY', 'OPAY', 'KUDA'] };

  it('accepts numbers or strings and de-duplicates payment methods', () => {
    const parsed = createOrderBody.parse({ ...base, xlmAmount: 150.5 });
    expect(parsed.xlmAmount).toBe('150.5');
    expect(parsed.paymentMethods).toEqual(['OPAY', 'KUDA']);
  });

  it('rejects too many decimals, zero amounts and unknown methods', () => {
    expect(createOrderBody.safeParse({ ...base, xlmAmount: '1.12345678' }).success).toBe(false);
    expect(createOrderBody.safeParse({ ...base, ngnRate: '520.255' }).success).toBe(false);
    expect(createOrderBody.safeParse({ ...base, xlmAmount: '0' }).success).toBe(false);
    expect(createOrderBody.safeParse({ ...base, paymentMethods: ['PAYPAL'] }).success).toBe(false);
    expect(createOrderBody.safeParse({ ...base, paymentMethods: [] }).success).toBe(false);
  });
});

describe('withdrawBody', () => {
  const destination = Keypair.random().publicKey();

  it('accepts a valid address and trims empty memos', () => {
    expect(withdrawBody.parse({ destination, amount: '25', memo: '' }).memo).toBeUndefined();
  });

  it('rejects secret keys and invalid addresses', () => {
    expect(withdrawBody.safeParse({ destination: Keypair.random().secret(), amount: '25' }).success).toBe(false);
    expect(withdrawBody.safeParse({ destination: 'GABC', amount: '25' }).success).toBe(false);
  });

  it('enforces the 28 byte memo limit', () => {
    expect(withdrawBody.safeParse({ destination, amount: '1', memo: 'x'.repeat(29) }).success).toBe(false);
  });
});

describe('submitKycBody', () => {
  const base = { idType: 'BVN', idNumber: '22212345678', firstName: 'Emeka', lastName: 'Okafor', dateOfBirth: '1992-04-18' };

  it('accepts a valid adult submission', () => {
    expect(submitKycBody.safeParse(base).success).toBe(true);
  });

  it('rejects short IDs and minors', () => {
    expect(submitKycBody.safeParse({ ...base, idNumber: '1234' }).success).toBe(false);
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 10);
    expect(submitKycBody.safeParse({ ...base, dateOfBirth: recent.toISOString().slice(0, 10) }).success).toBe(false);
  });
});

describe('payment accounts', () => {
  it('requires a bank name for bank transfers only', () => {
    const account = { accountName: 'Dayo Adebayo', accountNumber: '0123456789' };
    expect(paymentAccountBody.safeParse({ ...account, method: 'BANK_TRANSFER' }).success).toBe(false);
    expect(paymentAccountBody.safeParse({ ...account, method: 'BANK_TRANSFER', bankName: 'GTBank' }).success).toBe(true);
    expect(paymentAccountBody.safeParse({ ...account, method: 'PALMPAY' }).success).toBe(true);
  });

  it('normalises Nigerian phone numbers', () => {
    expect(nigerianPhone.parse('0803 123 4567')).toBe('+2348031234567');
    expect(nigerianPhone.parse('+2349051234567')).toBe('+2349051234567');
    expect(nigerianPhone.safeParse('0123').success).toBe(false);
  });
});
