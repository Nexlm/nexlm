import { StrKey } from '@stellar/stellar-sdk';
import { z } from 'zod';
import { PAYMENT_METHODS } from '../config/constants.js';

export const id = z.string().trim().min(1).max(64);

export const idParams = z.object({ id });

export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const xlmAmount = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d{1,7})?$/.test(v), 'Enter a valid XLM amount (up to 7 decimal places)')
  .refine((v) => Number(v) > 0, 'Amount must be greater than zero');

export const ngnRate = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter a valid Naira rate (up to 2 decimal places)')
  .refine((v) => Number(v) > 0, 'Rate must be greater than zero');

export const stellarAddress = z
  .string()
  .trim()
  .refine((v) => StrKey.isValidEd25519PublicKey(v), 'Enter a valid Stellar address (starts with G)');

export const paymentMethod = z.enum(PAYMENT_METHODS, {
  errorMap: () => ({ message: 'Unsupported payment method' }),
});

export const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
