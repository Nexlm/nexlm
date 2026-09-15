/**
 * Build step for Vercel: always generate the Prisma client, and apply
 * migrations when a database is configured. Without DATABASE_URL the build
 * still succeeds so the deployed API can explain what's missing.
 */
import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('npx prisma generate');

if (process.env.DATABASE_URL) {
  run('npx prisma migrate deploy');
} else {
  console.warn('DATABASE_URL is not set — skipping migrations. The API will report missing configuration.');
}
