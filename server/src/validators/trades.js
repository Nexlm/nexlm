import { z } from 'zod';
import { id, pageQuery, paymentMethod } from './common.js';

export const openTradeBody = z.object({
  orderId: id,
  paymentMethod,
});

export const myTradesQuery = z.object({
  scope: z.enum(['active', 'completed', 'cancelled', 'all']).default('all'),
  ...pageQuery,
});

export const sendMessageBody = z.object({
  content: z
    .string()
    .trim()
    .max(2000, 'Message must be 2000 characters or fewer')
    .optional()
    .transform((v) => v || undefined),
});
