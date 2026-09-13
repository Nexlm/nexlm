import { conflict } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { fingerprint } from '../lib/secrets.js';
import { isSmileConfigured, verifyNigerianId } from './smileId.js';

export async function getKycStatus(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      kycStatus: true,
      kycIdType: true,
      kycIdLast4: true,
      kycFullName: true,
      kycSubmittedAt: true,
      kycReviewedAt: true,
    },
  });
}

export async function submitKyc(user, input) {
  if (user.kycStatus === 'VERIFIED') throw conflict('Your identity is already verified');
  if (user.kycStatus === 'PENDING') throw conflict('Your verification is already under review');

  const idHash = fingerprint(`${input.idType}:${input.idNumber}`);
  const duplicate = await prisma.user.findFirst({
    where: { kycIdHash: idHash, id: { not: user.id } },
    select: { id: true },
  });
  if (duplicate) throw conflict('This ID is already linked to another Nexlm account');

  // Only a fingerprint and the last 4 digits are stored — never the full BVN/NIN.
  const submission = {
    kycIdType: input.idType,
    kycIdLast4: input.idNumber.slice(-4),
    kycIdHash: idHash,
    kycFullName: `${input.firstName} ${input.lastName}`,
    kycSubmittedAt: new Date(),
  };

  if (!isSmileConfigured()) {
    await prisma.user.update({ where: { id: user.id }, data: { ...submission, kycStatus: 'PENDING' } });
    return { status: 'PENDING', message: 'Thanks! Your details are queued for manual review.' };
  }

  const result = await verifyNigerianId({ userId: user.id, ...input });
  const status = result.verified ? 'VERIFIED' : 'REJECTED';

  await prisma.user.update({
    where: { id: user.id },
    data: { ...submission, kycStatus: status, kycReference: result.jobId, kycReviewedAt: new Date() },
  });

  return {
    status,
    message: result.verified
      ? 'Your identity has been verified. You can now trade.'
      : 'We could not match your details to this ID. Check your name and date of birth, then try again.',
  };
}
