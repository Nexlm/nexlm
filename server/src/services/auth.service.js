import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { badRequest, conflict, forbidden, unauthorized } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { encryptSecret } from '../lib/secrets.js';
import { sessionUserSelect } from '../lib/selects.js';
import { addHours } from '../lib/time.js';
import { signAccessToken } from '../middleware/auth.js';
import { fundTestnetAccount, generateKeypair } from '../stellar/wallet.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.service.js';

const BCRYPT_ROUNDS = 12;

// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('nexlm-timing-guard', BCRYPT_ROUNDS);

export async function register({ email, password, displayName }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { displayName: { equals: displayName, mode: 'insensitive' } }] },
    select: { email: true },
  });
  if (existing) {
    throw conflict(existing.email === email ? 'An account with this email already exists' : 'That display name is taken');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { publicKey, secret } = generateKeypair();
  const verifyToken = randomToken();

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash,
      stellarPublicKey: publicKey,
      stellarSecretEnc: encryptSecret(secret),
      emailVerifyTokenHash: sha256(verifyToken),
    },
    select: sessionUserSelect,
  });

  const background = Promise.all([
    fundTestnetAccount(publicKey).catch((err) => logger.warn('Friendbot funding failed', { err, publicKey })),
    sendVerificationEmail(email, verifyToken).catch((err) => logger.error('Verification email failed', { err })),
  ]);

  // Serverless functions can be frozen right after responding, so give this
  // work a chance to finish (bounded, so sign-up never hangs).
  if (env.isServerless) {
    await Promise.race([background, new Promise((resolve) => setTimeout(resolve, 8000))]);
  }

  return { user, token: signAccessToken(user) };
}

export async function login({ email, password }) {
  const record = await prisma.user.findUnique({
    where: { email },
    select: { ...sessionUserSelect, passwordHash: true },
  });

  const valid = await bcrypt.compare(password, record?.passwordHash ?? DUMMY_HASH);
  if (!record || !valid) throw unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');

  if (record.status !== 'ACTIVE') {
    throw forbidden(`Your account is ${record.status.toLowerCase()}. Contact support.`, 'ACCOUNT_RESTRICTED');
  }

  const { passwordHash: _omit, ...user } = record;
  return { user, token: signAccessToken(user) };
}

export async function verifyEmail(token) {
  const user = await prisma.user.findUnique({
    where: { emailVerifyTokenHash: sha256(token) },
    select: { id: true },
  });
  if (!user) throw badRequest('This verification link is invalid or has already been used');

  return prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyTokenHash: null },
    select: sessionUserSelect,
  });
}

export async function resendVerification(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  if (user.emailVerified) throw conflict('Your email is already verified');

  const token = randomToken();
  await prisma.user.update({ where: { id: userId }, data: { emailVerifyTokenHash: sha256(token) } });
  await sendVerificationEmail(user.email, token);
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  // Always succeed so the endpoint can't be used to discover registered emails.
  if (!user) return;

  const token = randomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetTokenHash: sha256(token), passwordResetExpiresAt: addHours(new Date(), 1) },
  });
  await sendPasswordResetEmail(email, token);
}

export async function resetPassword({ token, password }) {
  const user = await prisma.user.findUnique({
    where: { passwordResetTokenHash: sha256(token) },
    select: { id: true, passwordResetExpiresAt: true },
  });
  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    throw badRequest('This reset link is invalid or has expired');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
  });
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw badRequest('Your current password is incorrect');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
  });
}
