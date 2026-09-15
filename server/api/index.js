/**
 * Vercel serverless entry. Every request is rewritten here (see vercel.json)
 * and handled by the same Express app used by the long-running server.
 *
 * Differences from `src/index.js`:
 *  - no Socket.io (the client falls back to polling)
 *  - no interval scheduler (jobs run on demand and via /api/cron/tick)
 */
import { configErrors } from '../src/config/env.js';

let appPromise;

export default async function handler(req, res) {
  if (configErrors) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: 'SERVER_NOT_CONFIGURED',
          message: 'The API is missing required environment variables. Add them in Vercel → Settings → Environment Variables, then redeploy.',
          details: configErrors,
        },
      }),
    );
    return;
  }

  appPromise ??= import('../src/app.js').then((m) => m.createApp());
  const app = await appPromise;
  return app(req, res);
}
