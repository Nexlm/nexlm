import { z } from 'zod';
import { ngnRate, pageQuery, paymentMethod, xlmAmount } from './common.js';

export const orderType = z.enum(['BUY', 'SELL']);

export const createOrderBody = z.object({
  type: orderType,
  xlmAmount,
  ngnRate,
  paymentMethods: z
    .array(paymentMethod)
    .min(1, 'Choose at least one payment method')
    .transform((methods) => [...new Set(methods)]),
  terms: z
    .string()
    .trim()
    .max(500, 'Terms must be 500 characters or fewer')
    .optional()
    .transform((v) => v || undefined),
});

export const listOrdersQuery = z.object({
  type: orderType.default('SELL'),
  paymentMethod: paymentMethod.optional(),
  minAmount: xlmAmount.optional(),
  ...pageQuery,
});

export const myOrdersQuery = z.object({
  status: z.enum(['ACTIVE', 'FILLED', 'CANCELLED', 'EXPIRED']).optional(),
  ...pageQuery,
});
