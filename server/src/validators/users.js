import { z } from 'zod';
import { paymentMethod } from './common.js';

export const nigerianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .refine((v) => /^(\+234|234|0)[789][01]\d{8}$/.test(v), 'Enter a valid Nigerian phone number')
  .transform((v) => `+234${v.replace(/^(\+234|234|0)/, '')}`);

export const updateProfileBody = z.object({
  phone: nigerianPhone.optional(),
});

export const paymentAccountBody = z
  .object({
    method: paymentMethod,
    bankName: z.string().trim().min(2).max(60).optional(),
    accountName: z.string().trim().min(2, 'Account name is required').max(80),
    accountNumber: z.string().trim().regex(/^\d{10}$/, 'Account number must be 10 digits'),
  })
  .refine((v) => v.method !== 'BANK_TRANSFER' || Boolean(v.bankName), {
    message: 'Bank name is required for bank transfers',
    path: ['bankName'],
  });

export const profileParams = z.object({
  displayName: z.string().trim().min(3).max(24),
});
