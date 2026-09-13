/**
 * Creates (or promotes) an admin account.
 *
 *   ADMIN_EMAIL=admin@nexlm.app ADMIN_PASSWORD='S3cure-pass' npm run db:seed
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { encryptSecret } from '../src/lib/secrets.js';
import { fundTestnetAccount, generateKeypair } from '../src/stellar/wallet.js';

const email = process.env.ADMIN_EMAIL?.toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD to seed an admin account.');
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });

if (existing) {
  await prisma.user.update({ where: { email }, data: { role: 'ADMIN', emailVerified: true } });
  console.log(`Promoted ${email} to admin.`);
} else {
  const { publicKey, secret } = generateKeypair();
  await prisma.user.create({
    data: {
      email,
      displayName: process.env.ADMIN_DISPLAY_NAME ?? 'nexlm_admin',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      emailVerified: true,
      kycStatus: 'VERIFIED',
      stellarPublicKey: publicKey,
      stellarSecretEnc: encryptSecret(secret),
    },
  });
  await fundTestnetAccount(publicKey).catch(() => false);
  console.log(`Created admin ${email} (${publicKey}).`);
}

await prisma.$disconnect();
