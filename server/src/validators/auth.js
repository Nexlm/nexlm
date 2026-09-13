import { z } from 'zod';
import { email, password } from './common.js';

export const displayName = z
  .string()
  .trim()
  .min(3, 'Display name must be at least 3 characters')
  .max(24, 'Display name must be at most 24 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers and underscores only');

export const registerBody = z.object({ email, password, displayName });

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

const token = z.string().trim().regex(/^[a-f0-9]{64}$/, 'Invalid or malformed token');

export const verifyEmailBody = z.object({ token });

export const forgotPasswordBody = z.object({ email });

export const resetPasswordBody = z.object({ token, password });

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });
