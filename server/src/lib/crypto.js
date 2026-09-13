import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function keyBuffer(keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) throw new Error('Encryption key must be 32 bytes');
  return key;
}

/**
 * Encrypts a UTF-8 string with AES-256-GCM.
 * Output format: base64(iv).base64(authTag).base64(ciphertext)
 */
export function encrypt(plaintext, keyHex) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer(keyHex), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString('base64')).join('.');
}

export function decrypt(payload, keyHex) {
  const parts = String(payload).split('.');
  if (parts.length !== 3) throw new Error('Malformed encrypted payload');
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer(keyHex), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

export const hmacSha256 = (value, keyHex) =>
  crypto.createHmac('sha256', Buffer.from(keyHex, 'hex')).update(String(value)).digest('hex');
