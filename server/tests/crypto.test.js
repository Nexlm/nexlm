import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, hmacSha256, randomToken, sha256 } from '../src/lib/crypto.js';

const KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const OTHER_KEY = 'f'.repeat(64);
const SECRET = 'SBK2VIYYSVG76E7VC3QWYXQMXFGYJ4KVHDP4HNUMHX3Z3NZ2NMQKDOWN';

describe('secret encryption', () => {
  it('round-trips a Stellar secret', () => {
    expect(decrypt(encrypt(SECRET, KEY), KEY)).toBe(SECRET);
  });

  it('uses a fresh IV every time', () => {
    expect(encrypt(SECRET, KEY)).not.toBe(encrypt(SECRET, KEY));
  });

  it('fails with the wrong key', () => {
    expect(() => decrypt(encrypt(SECRET, KEY), OTHER_KEY)).toThrow();
  });

  it('detects tampering', () => {
    const [iv, tag, data] = encrypt(SECRET, KEY).split('.');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 0xff;
    expect(() => decrypt([iv, tag, flipped.toString('base64')].join('.'), KEY)).toThrow();
  });

  it('rejects malformed payloads and short keys', () => {
    expect(() => decrypt('not-encrypted', KEY)).toThrow('Malformed');
    expect(() => encrypt(SECRET, 'abcd')).toThrow('32 bytes');
  });
});

describe('hashing helpers', () => {
  it('produces stable hex digests', () => {
    expect(sha256('nexlm')).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256('nexlm')).toBe(sha256('nexlm'));
    expect(hmacSha256('BVN:12345678901', KEY)).not.toBe(hmacSha256('BVN:12345678901', OTHER_KEY));
  });

  it('generates random tokens of the requested size', () => {
    expect(randomToken()).toHaveLength(64);
    expect(randomToken(8)).toHaveLength(16);
    expect(randomToken()).not.toBe(randomToken());
  });
});
