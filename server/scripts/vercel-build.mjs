/**
 * Build step for Vercel.
 *
 * Always generates the Prisma client. Applies migrations when a reachable,
 * hosted DATABASE_URL is configured. A migration failure is reported loudly but
 * doesn't fail the deploy (set STRICT_MIGRATIONS=true to make it fatal), so the
 * API can still come up and explain the problem via /health?deep=1.
 */
import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('npx prisma generate');

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn('DATABASE_URL is not set — skipping migrations. The API will report missing configuration.');
  process.exit(0);
}

let host = '';
try {
  host = new URL(url).hostname;
} catch {
  // Leave host empty; handled below.
}

if (!host || ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host)) {
  console.warn(
    `DATABASE_URL points at "${host || 'an invalid URL'}", which Vercel can't reach — skipping migrations. Use a hosted Postgres connection string (e.g. Neon).`,
  );
  process.exit(0);
}

try {
  run('npx prisma migrate deploy');
} catch {
  const message =
    'Database migrations failed (see the Prisma error above). API requests that use the database will fail until they succeed. ' +
    'Check DATABASE_URL, then redeploy or run `npm run db:deploy -w server` with the production DATABASE_URL.';
  if (process.env.STRICT_MIGRATIONS === 'true') {
    console.error(message);
    process.exit(1);
  }
  console.warn(`\n⚠️  WARNING: ${message}\n`);
}
