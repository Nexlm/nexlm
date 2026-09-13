import { env } from '../config/env.js';
import { decrypt, encrypt, hmacSha256 } from './crypto.js';

/** Encrypts a Stellar secret seed for storage. */
export const encryptSecret = (secret) => encrypt(secret, env.ENCRYPTION_KEY);

/** Decrypts a stored Stellar secret seed. Only call this right before signing. */
export const decryptSecret = (payload) => decrypt(payload, env.ENCRYPTION_KEY);

/** Keyed hash for sensitive identifiers (BVN/NIN) so duplicates can be detected without storing them. */
export const fingerprint = (value) => hmacSha256(value, env.ENCRYPTION_KEY);
