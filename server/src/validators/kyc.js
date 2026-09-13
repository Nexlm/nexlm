import { z } from 'zod';

const name = z
  .string()
  .trim()
  .min(2, 'Name is too short')
  .max(50, 'Name is too long')
  .regex(/^[\p{L}' -]+$/u, 'Name contains invalid characters');

export const submitKycBody = z.object({
  idType: z.enum(['BVN', 'NIN']),
  idNumber: z.string().trim().regex(/^\d{11}$/, 'BVN and NIN are 11 digits'),
  firstName: name,
  lastName: name,
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
    .refine((v) => {
      const dob = new Date(`${v}T00:00:00Z`);
      if (Number.isNaN(dob.getTime())) return false;
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setUTCFullYear(eighteenYearsAgo.getUTCFullYear() - 18);
      return dob <= eighteenYearsAgo;
    }, 'You must be at least 18 years old'),
});
