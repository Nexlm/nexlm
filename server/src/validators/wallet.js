import { z } from 'zod';
import { stellarAddress, xlmAmount } from './common.js';

export const withdrawBody = z.object({
  destination: stellarAddress,
  amount: xlmAmount,
  memo: z
    .string()
    .trim()
    .max(28)
    .refine((v) => Buffer.byteLength(v, 'utf8') <= 28, 'Memo must be 28 bytes or fewer')
    .optional()
    .transform((v) => v || undefined),
});

export const activityQuery = z.object({
  cursor: z.string().trim().max(64).optional(),
});
