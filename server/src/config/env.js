import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 32 bytes encoded as hex'),

  STELLAR_NETWORK: z.enum(['testnet', 'public']).default('testnet'),
  HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  PLATFORM_SECRET_KEY: z.string().regex(/^S[A-Z2-7]{55}$/, 'PLATFORM_SECRET_KEY must be a Stellar secret seed'),

  TRADE_PAYMENT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  ORDER_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  MIN_TRADE_XLM: z.coerce.number().positive().default(10),
  MAX_TRADE_XLM: z.coerce.number().positive().default(100000),
  REQUIRE_KYC: bool.default('true'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Nexlm <no-reply@nexlm.app>'),

  CLOUDINARY_URL: z.string().optional(),

  SMILE_PARTNER_ID: z.string().optional(),
  SMILE_API_KEY: z.string().optional(),
  SMILE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
});

// Treat empty strings in .env as "unset" so optional values fall back to defaults.
const raw = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ''),
);

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  clientOrigins: parsed.data.CLIENT_URL.split(',').map((s) => s.trim()),
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
});
