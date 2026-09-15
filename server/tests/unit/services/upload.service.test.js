import fs from 'node:fs/promises';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { storeImage, UPLOAD_DIR } from '../../../src/services/upload.service.js';

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

afterAll(async () => {
  await fs.rm(path.join(UPLOAD_DIR, 'tests'), { recursive: true, force: true });
});

describe('storeImage', () => {
  it('requires a file', async () => {
    await expect(storeImage(undefined, 'tests')).rejects.toMatchObject({ status: 400, message: 'No image was uploaded' });
  });

  it('rejects files that are not really images', async () => {
    await expect(storeImage({ buffer: Buffer.from('<?php echo 1; ?>') }, 'tests')).rejects.toMatchObject({
      status: 400,
      message: 'Only JPEG, PNG or WebP images are allowed',
    });
  });

  it('stores a valid image and returns a public URL', async () => {
    const url = await storeImage({ buffer: png }, 'tests');
    expect(url).toMatch(/\/uploads\/tests\/[a-f0-9]{32}\.png$/);

    const filename = url.split('/').pop();
    await expect(fs.stat(path.join(UPLOAD_DIR, 'tests', filename))).resolves.toBeTruthy();
  });

  it('gives each upload its own name', async () => {
    const [a, b] = await Promise.all([storeImage({ buffer: png }, 'tests'), storeImage({ buffer: png }, 'tests')]);
    expect(a).not.toBe(b);
  });
});
