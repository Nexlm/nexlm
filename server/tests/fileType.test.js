import { describe, expect, it } from 'vitest';
import { detectImageType } from '../src/lib/fileType.js';

const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);

describe('detectImageType', () => {
  it('recognises JPEG, PNG and WebP by signature', () => {
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectImageType(Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ', 'binary'))).toBe('image/webp');
  });

  it('rejects everything else', () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImageType(pad([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // %PDF
    expect(detectImageType(Buffer.alloc(4))).toBeNull();
    expect(detectImageType(undefined)).toBeNull();
  });
});
