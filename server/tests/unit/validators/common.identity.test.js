import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { email, id, idParams, password, paymentMethod, stellarAddress } from '../../../src/validators/common.js';

describe('email', () => {
  it('lowercases and trims', () => {
    expect(email.parse('  Ada@Example.COM ')).toBe('ada@example.com');
  });

  it('rejects invalid addresses', () => {
    expect(email.safeParse('ada@').success).toBe(false);
  });
});

describe('password', () => {
  it('requires a letter, a number and 8 characters', () => {
    expect(password.safeParse('naira2026').success).toBe(true);
    expect(password.safeParse('short1').success).toBe(false);
    expect(password.safeParse('12345678').success).toBe(false);
    expect(password.safeParse('onlyletters').success).toBe(false);
  });

  it('caps the length', () => {
    expect(password.safeParse(`a1${'x'.repeat(127)}`).success).toBe(false);
  });
});

describe('stellarAddress', () => {
  it('accepts public keys', () => {
    const address = Keypair.random().publicKey();
    expect(stellarAddress.parse(` ${address} `)).toBe(address);
  });

  it('rejects secret seeds so they are never pasted as a destination', () => {
    expect(stellarAddress.safeParse(Keypair.random().secret()).success).toBe(false);
  });
});

describe('paymentMethod', () => {
  it('accepts supported rails', () => {
    expect(paymentMethod.parse('OPAY')).toBe('OPAY');
  });

  it('explains unsupported ones', () => {
    const result = paymentMethod.safeParse('PAYPAL');
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Unsupported payment method');
  });
});

describe('id / idParams', () => {
  it('trims and bounds ids', () => {
    expect(id.parse(' abc ')).toBe('abc');
    expect(id.safeParse('').success).toBe(false);
    expect(idParams.safeParse({ id: 'x'.repeat(65) }).success).toBe(false);
  });
});
