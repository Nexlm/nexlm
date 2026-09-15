import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { randomToken } from '../lib/crypto.js';
import { badRequest, serviceUnavailable } from '../lib/errors.js';
import { detectImageType, EXTENSIONS } from '../lib/fileType.js';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: `nexlm/${folder}`, resource_type: 'image' }, (err, result) =>
        err ? reject(err) : resolve(result.secure_url),
      )
      .end(buffer);
  });
}

async function uploadToDisk(buffer, folder, mime) {
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomToken(16)}.${EXTENSIONS[mime]}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `${env.PUBLIC_API_URL}/uploads/${folder}/${filename}`;
}

/** Validates an in-memory image by content and stores it. Returns a public URL. */
export async function storeImage(file, folder) {
  if (!file) throw badRequest('No image was uploaded');
  const mime = detectImageType(file.buffer);
  if (!mime) throw badRequest('Only JPEG, PNG or WebP images are allowed');

  if (env.CLOUDINARY_URL) return uploadToCloudinary(file.buffer, folder);

  // Serverless file systems are temporary, so local storage would lose images.
  if (env.isServerless) {
    throw serviceUnavailable('Image uploads need CLOUDINARY_URL configured on the server.', 'UPLOADS_NOT_CONFIGURED');
  }

  return uploadToDisk(file.buffer, folder, mime);
}
