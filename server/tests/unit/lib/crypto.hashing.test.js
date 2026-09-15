import { describe, expect, it } from 'vitest';
import { hmacSha256, randomToken, sha256 } from '../../../src/lib/crypto.js';

describe('randomToken', () => {
  it('returns hex of the requested byte length', () => {
    expect(randomToken()).toMatch(/^[a-f0-9]{64}$/);
    expect(randomToken(8)).toMatch(/^[a-f0-9]{16}$/);
  });

  it('does not repeat', () => {
    expect(new Set(Array.from({ length: 50 }, () => randomToken())).size).toBe(50);
  });
});

describe('sha256', () => {
  it('matches the standard test vector', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('stringifies non-string input', () => {
    expect(sha256(123)).toBe(sha256('123'));
  });
});

describe('hmacSha256', () => {
  const key = '01'.repeat(32);

  it('is deterministic for the same key', () => {
    expect(hmacSha256('22212345678', key)).toBe(hmacSha256('22212345678', key));
  });

  it('changes with the key, so fingerprints cannot be brute-forced without it', () => {
    expect(hmacSha256('22212345678', key)).not.toBe(hmacSha256('22212345678', '02'.repeat(32)));
  });

  it('differs from a plain hash', () => {
    expect(hmacSha256('abc', key)).not.toBe(sha256('abc'));
  });
});
