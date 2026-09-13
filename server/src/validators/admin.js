import { z } from 'zod';
import { pageQuery } from './common.js';

export const listUsersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']).optional(),
  kycStatus: z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']).optional(),
  ...pageQuery,
});

export const updateUserStatusBody = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
});

export const kycDecisionBody = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
});

export const listTradesQuery = z.object({
  status: z
    .enum(['PENDING_ESCROW', 'ESCROW_LOCKED', 'PAID', 'RELEASING', 'REFUNDING', 'COMPLETED', 'CANCELLED'])
    .optional(),
  ...pageQuery,
});
