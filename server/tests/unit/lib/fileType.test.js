import { describe, expect, it } from 'vitest';
import { detectImageType, EXTENSIONS } from '../../../src/lib/fileType.js';

const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);

describe('detectImageType', () => {
  it('detects JPEG, PNG and WebP by magic bytes', () => {
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'ascii'))).toBe('image/webp');
  });

  it('rejects files renamed to look like images', () => {
    expect(detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(detectImageType(pad([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // %PDF
    expect(detectImageType(Buffer.from('GIF89a' + '\0'.repeat(10)))).toBeNull();
  });

  it('rejects empty and truncated buffers', () => {
    expect(detectImageType(undefined)).toBeNull();
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it('has an extension for every detected type', () => {
    expect(EXTENSIONS).toEqual({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' });
  });
});
