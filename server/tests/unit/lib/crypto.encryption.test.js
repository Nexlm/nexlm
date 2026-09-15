import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from '../../../src/lib/crypto.js';

const key = 'ab'.repeat(32);
const otherKey = 'cd'.repeat(32);
const seed = 'SBGWKM3CD4IL47QN6X54N6Y33T3JDNVI6AIJ6CD5IM47HG3IG4O36XCU';

describe('encrypt / decrypt', () => {
  it('round-trips a Stellar secret', () => {
    expect(decrypt(encrypt(seed, key), key)).toBe(seed);
  });

  it('round-trips unicode', () => {
    expect(decrypt(encrypt('₦ naira ✓', key), key)).toBe('₦ naira ✓');
  });

  it('uses a fresh IV every time', () => {
    expect(encrypt(seed, key)).not.toBe(encrypt(seed, key));
  });

  it('produces iv.tag.ciphertext', () => {
    expect(encrypt(seed, key).split('.')).toHaveLength(3);
  });

  it('fails with the wrong key', () => {
    expect(() => decrypt(encrypt(seed, key), otherKey)).toThrow();
  });

  it('detects tampering', () => {
    const [iv, tag, data] = encrypt(seed, key).split('.');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 0xff;
    expect(() => decrypt([iv, tag, flipped.toString('base64')].join('.'), key)).toThrow();
  });

  it('rejects malformed payloads', () => {
    expect(() => decrypt('not-encrypted', key)).toThrow('Malformed encrypted payload');
  });

  it('rejects keys that are not 32 bytes', () => {
    expect(() => encrypt(seed, 'abcd')).toThrow('Encryption key must be 32 bytes');
  });
});
